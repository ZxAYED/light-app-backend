import { AuthorRole, UserRole } from "@prisma/client";
import status from "http-status";
import prisma from "../../../shared/prisma";
import AppError from "../../Errors/AppError";
import { CreateGoalInput, UpdateGoalInput } from "./goal.validation";

export const GoalService = {
  createGoal: async (
    payload: CreateGoalInput & { authorId: string; authorRole: AuthorRole }
  ) => {
    const { assignedChildIds, ...goalData } = payload;

    return prisma.$transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          ...goalData,
          authorId: payload.authorId,
          authorRole: payload.authorRole,
        },
      });
     
   await tx.goalAssignment.createMany({
        data: assignedChildIds.map((childId) => ({
          childId,
          goalId: goal.id,
        })),
      });
 

      return goal;
    });
  },

  updateGoal: async (
    payload: UpdateGoalInput & {
      authorId: string;
      authorRole: AuthorRole;
      goalId: string;
    }
  ) => {
    
    const existingGoal = await prisma.goal.findUnique({
      where: { id: payload.goalId },
    });

    if (!existingGoal) throw new AppError(status.NOT_FOUND, "Goal not found");
    if (existingGoal.isDeleted)
      throw new AppError(status.BAD_REQUEST, "This goal is deleted");

    if (existingGoal.authorRole === UserRole.CHILD) {
      const isAssigned = await prisma.goalAssignment.findFirst({
        where: {
          goalId: payload.goalId,
          childId: payload.authorId,
        },
      });
      const authorMatch = payload.authorId === existingGoal.authorId;
      if (!isAssigned   && !authorMatch)
        throw new AppError(
          status.UNAUTHORIZED,
          "You are not authorized to update this goal"
        );
    }

    const updatedData = {
      status: payload.status,
      endDate: payload.endDate,
      startDate: payload.startDate,
      durationMin: payload.durationMin,
      rewardCoins: payload.rewardCoins,
      isDeleted: payload.isDeleted ?? undefined,
      type: payload.type,
      title: payload.title,
      description: payload.description,
    };

    return prisma.$transaction(async (tx) => {
      const updated = await tx.goal.update({
        where: { id: payload.goalId },
        data: updatedData,
      });

      if (payload.isDeleted === true) {
        await tx.goalAssignment.updateMany({
          where: { goalId: payload.goalId },
          data: { isDeleted: true },
        });
        return updated;
      }

      if (payload.assignedChildIds) {
        await tx.goalAssignment.deleteMany({
          where: { goalId: payload.goalId },
        });

        await tx.goalAssignment.createMany({
          data: payload.assignedChildIds.map((childId) => ({
            childId,
            goalId: payload.goalId,
          })),
        });
      }

      return updated;
    });
  },

  getParentGoals: async (parentId: string) => {
    return prisma.goal.findMany({
      where: { authorId: parentId, isDeleted: false },
      include: {
        assignedChildren: {
          where: { isDeleted: false },
          include: {
            child: true,
          },
        },
      },
    });
  },

  getChildGoals: async (userId: string) => {
const childProfile =  await prisma.childProfile.findUnique({
  where: { userId },
})
if (!childProfile) throw new AppError(status.NOT_FOUND, "Child not found");

    return prisma.goalAssignment.findMany({
      where: { childId: childProfile.id, isDeleted: false }, 
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

    // 1. Child profile
    const child = await tx.childProfile.findUnique({
      where: { userId: payload.userId }
    });

    if (!child) throw new AppError(404, "Child profile not found");

    // 2. Fetch assignment + goal
    const assignment = await tx.goalAssignment.findUnique({
      where: {
        goalId_childId: {
          goalId: payload.goalId,
          childId: child.id
        }
      },
      include: {
        goal: true
      }
    });

    if (!assignment) throw new AppError(404, "Goal assignment not found");

    // 3. Validate minutes
    if (payload.minutesCompleted <= 0) {
      throw new AppError(400, "minutesCompleted must be greater than 0");
    }

    const duration = assignment.goal.durationMin || 0;

    if (duration <= 0) {
      throw new AppError(400, "Goal duration is invalid");
    }

    // Convert current % → completed minutes
    const previousMinutes = (assignment.progress / 100) * duration;

    // Calculate new total minutes
    const newMinutes = previousMinutes + payload.minutesCompleted;

    // Convert to new percentage
    const newPercentage = Math.min(
      Math.round((newMinutes / duration) * 100),
      100
    );

    const isFinished = newPercentage >= 100;

    // 4. Update assignment progress
    const updatedAssignment = await tx.goalAssignment.update({
      where: { id: assignment.id },
      data: {
        progress: newPercentage
      }
    });

    // 5. Update goal percentage + status
    const updatedGoal = await tx.goal.update({
      where: { id: assignment.goalId },
      data: {
        progress: newPercentage,
        status: isFinished ? "COMPLETED" : assignment.goal.status
      }
    });

    // 6. Handle reward only once
    if (isFinished && assignment.rewardGiven === false) {

      // Add reward coins
      await tx.childProfile.update({
        where: { id: child.id },
        data: {
          coins: child.coins + assignment.goal.rewardCoins
        }
      });

      // Mark rewardGiven = true
      await tx.goalAssignment.update({
        where: { id: assignment.id },
        data: { rewardGiven: true }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          childId: child.id,
          action: "GOAL_COMPLETED",
          metadata: {
            goalId: assignment.goalId,
            rewardCoins: assignment.goal.rewardCoins
          }
        }
      });

      // Notification
      await tx.notification.create({
        data: {
          parentId: assignment.goal.authorId,
          childId: child.id,
          goalId: assignment.goal.id,
          type: "GOAL_COMPLETED",
          title: "Goal Completed!",
          message: `${child.name} completed the goal "${assignment.goal.title}".`
        }
      });
    }

    // 7. Final response
    return {
      progress: newPercentage,
      completed: isFinished,
      goal: updatedGoal,
      goalAssignment: updatedAssignment
    };
  });
},

resetGoalProgress: async (payload: {
  goalId: string;
  userId: string;
}) => {
  return prisma.$transaction(async (tx) => {

    const child = await tx.childProfile.findUnique({
      where: { userId: payload.userId }
    });

    if (!child) throw new AppError(404, "Child profile not found");

    const assignment = await tx.goalAssignment.findUnique({
      where: {
        goalId_childId: {
          goalId: payload.goalId,
          childId: child.id
        }
      }
    });

    if (!assignment)
      throw new AppError(404, "Goal assignment not found");

    const resetAssignment = await tx.goalAssignment.update({
      where: { id: assignment.id },
      data: {
        progress: 0,
        lastResetAt: new Date()
      }
    });

    return {
      message: "Progress reset successfully",
      goalAssignment: resetAssignment
    };
  });
},




};
