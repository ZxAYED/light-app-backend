import { AuthorRole, UserRole } from "@prisma/client";
import status from "http-status";
import prisma from "../../../shared/prisma";
import AppError from "../../Errors/AppError";
import { CreateGoalInput, UpdateGoalInput } from "./goal.validation";

export const GoalService = {
  createGoal: async (payload: CreateGoalInput & { authorId: string, authorRole: AuthorRole }) => {
    const { assignedChildren, ...goalData } = payload;

    return await prisma.$transaction(async (tx) => {

      const goal = await tx.goal.create({
        data: {
          ...goalData,
          authorId: payload.authorId,
          authorRole: payload.authorRole,
        },
      });

      // Assign children
      await tx.goalAssignment.createMany({
        data: assignedChildren.map((childId) => ({
          childId,
          goalId: goal.id,
        })),
      });

      return goal;
    });
  },

  updateGoal: async (payload: UpdateGoalInput & { authorId: string, authorRole: AuthorRole, goalId: string }) => {
    

    const existingGoal = await prisma.goal.findUnique({
      where: { id: payload.goalId },
    });

    if (!existingGoal) {
      throw new AppError(status.NOT_FOUND, "Goal not found");
    }


    if (existingGoal.isDeleted) {
      throw new AppError(status.BAD_REQUEST, "This goal is deleted");
    }
// if(existingGoal.status === GoalStatus.CANCELLED){
//         throw new AppError(status.BAD_REQUEST, "This goal is cancelled");
//       }

// if(existingGoal.status === GoalStatus.COMPLETED){
//         throw new AppError(status.BAD_REQUEST, "This goal is completed");
//       }
      
    if (existingGoal.authorId === UserRole.CHILD) {
      const isAssigned = await prisma.goalAssignment.findFirst({
        where: {
          goalId: payload.goalId,
          childId: payload.authorId,
        },
      });
      if (!isAssigned) {
        throw new AppError(status.UNAUTHORIZED, "You are not authorized to update this goal");
      }
      const childProfile = await prisma.childProfile.findUnique({
        where: {
          userId: payload.authorId,
        },
      });
      if (!childProfile) {
        throw new AppError(status.NOT_FOUND, "Child profile not found");
      }


    }
const updatedData = {
  progress: payload.progress,
  status: payload.status,
  endDate: payload.endDate,
  startDate: payload.startDate,
  durationMin: payload.durationMin,
  rewardCoins: payload.rewardCoins,
  isDeleted: payload.isDeleted,
  type: payload.type,
  title: payload.title,
  description: payload.description,
  assignedChildIds: payload.assignedChildIds, 
}

    return prisma.$transaction(async (tx) => {

      const updated = await tx.goal.update({
        where: { id: payload.goalId },
        data: updatedData,
      });

      // Re-assign children if provided
      if (payload.assignedChildIds?.length ) {
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
    if(!parentId){
      throw new AppError(404, "Parent Not Found")
    }
    return prisma.goal.findMany({
      where: { authorId: parentId },
      include: {
        assignedChildren: {
          include: { child: true },
        },
      },
    });
  },

  getChildGoals: async (childId: string) => {
     if(!childId){
      throw new AppError(404, "Child Not Found")
    }
    return prisma.goalAssignment.findMany({
      where: { childId },
      include: {
        goal: true,
      },
    });
  },
};
