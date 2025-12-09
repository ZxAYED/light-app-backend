import { AuthorRole, GoalStatus, UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";
import AppError from "../../Errors/AppError";
import { CreateGoalInput, UpdateGoalInput } from "./goal.validation";

export const GoalService = {

 createGoal: async (
  payload: CreateGoalInput & { authorId: string; authorRole: UserRole }
) => {
  const { assignedChildIds, ...goalData } = payload;

  // --- CHILD VALIDATION ---
  if (payload.authorRole === UserRole.CHILD) {
    const childProfile = await prisma.childProfile.findUnique({
      where: { userId: payload.authorId },
    });

    if (!childProfile) throw new AppError(404, "Child profile not found");

    if (!childProfile.createGoals)
      throw new AppError(403, "You are not allowed to create goals");

    // Child can only assign **themselves**
    if (assignedChildIds.some((id) => id !== payload.authorId)) {
      throw new AppError(
        403,
        "Children cannot assign goals to other children"
      );
    }
  }

  // --- CREATE GOAL ---
  return prisma.$transaction(async (tx) => {
    const createdGoal = await tx.goal.create({
      data: {
        ...goalData,
        authorId: payload.authorId,
        authorRole: payload.authorRole as AuthorRole,
        status: "ACTIVE",
      },
    });

    // Assign children
    await tx.goalAssignment.createMany({
      data: assignedChildIds.map((childId) => ({
        goalId: createdGoal.id,
        childId,
      })),
    });

    return createdGoal;
  });
},


updateGoal: async (
    payload: UpdateGoalInput & {
      goalId: string;
      authorId: string;
      authorRole: AuthorRole;
    }
  ) => {
  const existingGoal = await prisma.goal.findUnique({
    where: { id: payload.goalId },
    include: { assignedChildren: true },
  });

  if (!existingGoal) throw new AppError(404, "Goal not found");
  if (existingGoal.isDeleted) throw new AppError(400, "Goal is deleted");

  // --- CHILD VALIDATION ---
  if (payload.authorRole === UserRole.CHILD) {
    const childProfile = await prisma.childProfile.findUnique({
      where: { userId: payload.authorId },
    });

    if (!childProfile) throw new AppError(404, "Child profile not found");

    // must be assigned
    const isAssigned = existingGoal.assignedChildren.some(
      (g) => g.childId === payload.authorId
    );
    if (!isAssigned)
      throw new AppError(403, "You are not assigned to this goal");

    // must have edit permission
    if (!childProfile.createGoals)
      throw new AppError(403, "You cannot update goals");

    // Child cannot update forbidden fields
    const forbidden = [
      "rewardCoins",
      "durationMin",
      "type","status",
      "assignedChildIds",
      "isDeleted",
      "startDate",
      "endDate",
    ];

    for (const key of forbidden) {
      if ((payload as any)[key] !== undefined) {
        throw new AppError(403, `Children cannot update ${key}`);
      }
    }
  }

 
  return prisma.$transaction(async (tx) => {
    const updatedGoal = await tx.goal.update({
      where: { id: payload.goalId },
      data: {
        title: payload.title,
        description: payload.description,
        rewardCoins: payload.rewardCoins,
        status: payload.status,
        startDate: payload.startDate,
        endDate: payload.endDate,
        type: payload.type,
        durationMin: payload.durationMin,
        isDeleted: payload.isDeleted ?? undefined,
      },
    });

    // Parent-specific logic
    if (payload.authorRole === UserRole.PARENT) {
      // Handle deletion
      if (payload.isDeleted === true) {
        await tx.goalAssignment.updateMany({
          where: { goalId: payload.goalId },
          data: { isDeleted: true },
        });
        return updatedGoal;
      }

      // Update assigned children
      if (payload.assignedChildIds) {
        await tx.goalAssignment.deleteMany({
          where: { goalId: payload.goalId },
        });

        await tx.goalAssignment.createMany({
          data: payload.assignedChildIds.map((childId) => ({
            goalId: payload.goalId,
            childId,
          })),
        });
      }
    }

    return updatedGoal;
  });
},



 getParentGoals: async (parentId: string) => {
  const goals = await prisma.goal.findMany({
    where: { authorId: parentId, isDeleted: false },
    include: {
      assignedChildren: {
        where: { isDeleted: false },
        include: { child: true },
      },
    },
  });

  return goals.map((g) => ({
    ...g,
    averageProgress:
      g.assignedChildren.reduce((sum, a) => sum + (a.percentage ?? 0), 0) /
      (g.assignedChildren.length || 1),
    totalProgress: g.assignedChildren.reduce((sum, a) => sum + (a.percentage ?? 0), 0),
    completedCount: g.assignedChildren.filter((a) => (a.percentage ?? 0) >= 100).length,
    totalChildren: g.assignedChildren.length,
  }));
},



  getChildGoals: async (userId: string) => {
    const childProfile = await prisma.childProfile.findUnique({
      where: { userId },
    });

    if (!childProfile) throw new AppError(404, "Child not found");

    return prisma.goalAssignment.findMany({
      where: {
        childId: childProfile.id,
        isDeleted: false
      },
      include: {
        goal: true,
      },
    });
  },


updateProgress: async (payload: {
  goalId: string;
  userId: string;
  minutesCompleted: number;
}) => {
  return prisma.$transaction(async (tx) => {
    // 1. Get child profile
    const child = await tx.childProfile.findUnique({
      where: { userId: payload.userId },
    });
    if (!child) throw new AppError(404, "Child profile not found");

    // 2. Get assignment
    const assignment = await tx.goalAssignment.findUnique({
      where: {
        goalId_childId: {
          goalId: payload.goalId,
          childId: child.id,
        },
      },
      include: { goal: true },
    });

    if (!assignment) throw new AppError(404, "Goal assignment not found");
    if (assignment.goal.status === "PAUSED")
      throw new AppError(400, "Goal is paused");

    if (payload.minutesCompleted <= 0)
      throw new AppError(400, "minutesCompleted must be > 0");

    const duration = assignment.goal.durationMin || 0;
    if (duration <= 0)
      throw new AppError(400, "Goal duration is not set");

    // Convert progress % back to minutes
    let currentMinutes = Math.round(((assignment.percentage ?? 0) / 100) * duration);

    // Clamp minutes to avoid cheating
    let newMinutes = Math.min(
      currentMinutes + payload.minutesCompleted,
      duration
    );

    const newPercent = Math.round((newMinutes / duration) * 100);
    const childCompleted = newPercent >= 100;
    const previouslyCompleted = (assignment.percentage ?? 0) >= 100;
    const justCompleted = childCompleted && !previouslyCompleted;

    // 3. Update assignment progress
 await tx.goalAssignment.update({
      where: { id: assignment.id },
      data: {
        percentage: newPercent,
      },
    });

    // 4. Recalculate global goal progress (average of all child progresses)
    const allAssignments = await tx.goalAssignment.findMany({
      where: { goalId: payload.goalId, isDeleted: false },
      select: { percentage: true },
    });

    const totalChildren = allAssignments.length;
    const completedCount = allAssignments.filter((a) => (a.percentage ?? 0) >= 100).length;

    const averageProgress =
      Math.round(
        allAssignments.reduce((sum, a) => sum + (a.percentage ?? 0), 0) /
          totalChildren
      ) || 0;

    const globalCompleted = completedCount === totalChildren;

    // const rewardCoins = globalCompleted
    //   ? assignment.goal.rewardCoins || 0
    //   : 0;

    // 5. Update global goal
    await tx.goal.update({
      where: { id: payload.goalId },
      data: {
        progress: averageProgress,
        status: globalCompleted ? GoalStatus.COMPLETED : assignment.goal.status,
      },
    });

    // 6. If child just completed, give coins and increment completedTask
    if (justCompleted) {
      await tx.childProfile.update({
        where: { id: child.id },
        data: {
          coins: { increment: assignment.goal.rewardCoins || 0 },
          completedTask: { increment: 1 },
        },
      });
    }

    return {
      childProgressPercent: newPercent,
      childMinutesLogged: newMinutes,
      childCompleted,
      goalStatus: globalCompleted ? "COMPLETED" : assignment.goal.status,
      rewardGiven: justCompleted ? assignment.goal.rewardCoins : 0,
      averageProgress,
      completedCount,
      totalChildren,
    };
  });
},

};
