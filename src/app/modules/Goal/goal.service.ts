import { AuthorRole, GoalStatus, NotificationType, UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";
import AppError from "../../Errors/AppError";
import { NotificationService } from "../notification/notification.service";
import { CreateGoalInput, UpdateGoalInput } from "./goal.validation";

export const GoalService = {
 startTask: async (payload: { goalId: string; userId: string }) => {

  const child = await prisma.childProfile.findUnique({ where: { userId: payload.userId } });
  if (!child) throw new AppError(404, "Child profile not found");

  const assignment = await prisma.goalAssignment.findUnique({
    where: { goalId_childId: { goalId: payload.goalId, childId: child.id } },
    include: { goal: true },
  });

  if (!assignment) throw new AppError(404, "Goal assignment not found");

  if (assignment.goal.status === "PAUSED") throw new AppError(400, "Goal is paused");
  if (assignment.goal.status === "COMPLETED") throw new AppError(400, "Goal is completed");

  const duration = assignment.goal.durationMin || 0;

  if (duration <= 0) throw new AppError(400, "Goal duration is not set");
  
  const currentMinutes = Math.round(((assignment.percentage ?? 0) / 100) * duration);
  const remaining = Math.max(duration - currentMinutes, 0);
  if (remaining === 0) {
    return {
      goalId: payload.goalId,
      childId: child.id,
      scheduledMs: 0,
      endsAt: new Date(),
      alreadyCompleted: true,
    };
  }
  const key = `${payload.goalId}:${child.id}`;
  if ((global as any).__goalTimers?.has(key)) {
    const t = (global as any).__goalTimers.get(key);
    clearTimeout(t);
  } else {
    (global as any).__goalTimers = (global as any).__goalTimers || new Map<string, NodeJS.Timeout>();
  }
  const ms = remaining * 60 * 1000;
  const timeout = setTimeout(async () => {
    try {
      await GoalService.updateProgress({ goalId: payload.goalId, userId: payload.userId, minutesCompleted: remaining });
    } catch {}
    finally {
      (global as any).__goalTimers.delete(key);
    }
  }, ms);
  (global as any).__goalTimers.set(key, timeout);
  const endsAt = new Date(Date.now() + ms);
  return { goalId: payload.goalId, childId: child.id, scheduledMs: ms, endsAt };
 },

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

  const createdGoal = await prisma.$transaction(async (tx) => {
    const g = await tx.goal.create({
      data: {
        ...goalData,
        authorId: payload.authorId,
        authorRole: payload.authorRole as AuthorRole,
        status: "ACTIVE",
      },
    });
    await tx.goalAssignment.createMany({
      data: assignedChildIds.map((childId) => ({
        goalId: g.id,
        childId,
      })),
    });
    return g;
  });
  for (const childId of assignedChildIds) {
    await NotificationService.createAndSendNow({
      type: NotificationType.GOAL_CREATED,
      title: "New goal assigned",
      message: `You have a new goal: ${createdGoal.title}`,
      childId,
      data: { goalId: createdGoal.id },
    });
  }
  return createdGoal;
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

 
  const updatedGoal = await prisma.$transaction(async (tx) => {
    const g = await tx.goal.update({
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
    if (payload.authorRole === UserRole.PARENT) {
      if (payload.isDeleted === true) {
        await tx.goalAssignment.updateMany({
          where: { goalId: payload.goalId },
          data: { isDeleted: true },
        });
        return g;
      }
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
    return g;
  });
  const assigned = await prisma.goalAssignment.findMany({
    where: { goalId: payload.goalId },
    select: { childId: true },
  });
  for (const a of assigned) {
    await NotificationService.createAndSendNow({
      type: NotificationType.GOAL_UPDATED,
      title: "Goal updated",
      message: `Your goal was updated: ${updatedGoal.title}`,
      childId: a.childId,
      data: { goalId: payload.goalId },
    });
  }
  return updatedGoal;
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
  const result = await prisma.$transaction(async (tx) => {
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
  const childProfile = await prisma.childProfile.findUnique({
    where: { userId: payload.userId },
    select: { id: true, name: true },
  });
  const goal = await prisma.goal.findUnique({
    where: { id: payload.goalId },
    select: { title: true, authorId: true },
  });
  if (goal) {
    await NotificationService.createAndSendNow({
      type: NotificationType.CHILD_PROGRESS_UPDATE,
      title: "Progress updated",
      message: `${childProfile?.name || "Child"} progress on ${goal.title} is ${result.childProgressPercent}%`,
      parentUserId: goal.authorId,
      data: { goalId: payload.goalId, percent: String(result.childProgressPercent) },
    });
    if (result.childCompleted && (result.rewardGiven || 0) > 0 && childProfile) {
      await NotificationService.createAndSendNow({
        type: NotificationType.REWARD_UNLOCKED,
        title: "Reward unlocked",
        message: `You earned ${result.rewardGiven} coins on ${goal.title}`,
        childId: childProfile.id,
        data: { goalId: payload.goalId },
      });
    }
    if (result.goalStatus === "COMPLETED") {
      await NotificationService.createAndSendNow({
        type: NotificationType.GOAL_COMPLETED,
        title: "Goal completed",
        message: `${goal.title} has been completed`,
        parentUserId: goal.authorId,
        data: { goalId: payload.goalId },
      });
      const assigned = await prisma.goalAssignment.findMany({
        where: { goalId: payload.goalId },
        select: { childId: true },
      });
      for (const a of assigned) {
        await NotificationService.createAndSendNow({
          type: NotificationType.GOAL_COMPLETED,
          title: "Goal completed",
          message: `${goal.title} has been completed`,
          childId: a.childId,
          data: { goalId: payload.goalId },
        });
      }
    }
  }
  return result;
},

};
