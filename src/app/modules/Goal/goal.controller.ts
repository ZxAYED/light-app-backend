import { User, UserRole } from "@prisma/client";
import { Request, RequestHandler } from "express";
import status from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import AppError from "../../Errors/AppError";
import { GoalService } from "./goal.service";

const createGoal: RequestHandler = catchAsync(
  async (req: Request & { user?: User }, res) => {
    if (!req.user?.id)
      throw new AppError(status.UNAUTHORIZED, "Unauthorized access");

    const payload = {
      ...req.body,
      authorId: req.user.id,
      authorRole: req.user.role,
    };

    const result = await GoalService.createGoal(payload);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Goal created successfully.",
      data: result,
    });
  }
);

const updateGoal: RequestHandler = catchAsync(
  async (req: Request & { user?: User }, res) => {
    if (!req.user?.id)
      throw new AppError(status.UNAUTHORIZED, "Unauthorized access");

    const { goalId } = req.params;

    const payload = {
      ...req.body,
      goalId,
      authorId: req.user.id,
      authorRole: req.user.role,
    };

    const result = await GoalService.updateGoal(payload);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Goal updated successfully.",
      data: result,
    });
  }
);

const getParentGoals: RequestHandler = catchAsync(
  async (req: Request & { user?: any }, res) => {
    if (req.user.role !== UserRole.PARENT){
      throw new AppError(status.UNAUTHORIZED, "Only Parents can view goals of their own created goals for children");
    }      

    const result = await GoalService.getParentGoals(req.user.id);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Parent goals fetched successfully.",
      data: result,
    });
  }
);

const getChildGoals: RequestHandler = catchAsync(
  async (req: Request & { user?: any }, res) => {
    if (req.user.role !== UserRole.CHILD) {
      throw new AppError(status.UNAUTHORIZED, "Only children can view goals assigned to them");
    }

    const result = await GoalService.getChildGoals(req.user.id);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Child goals fetched successfully.",
      data: result,
    });
  }
);

const updateProgress: RequestHandler = catchAsync(
  async (req: Request & { user?: any }, res) => {
    const payload = {
      goalId: req.params.goalId,
      minutesCompleted: req.body.minutesCompleted,
      userId: req.user.id,
    };

    const result = await GoalService.updateProgress(payload);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Progress updated successfully.",
      data: result,
    });
  }
);

export const GoalController = {
  createGoal,
  updateGoal,
  getParentGoals,
  getChildGoals,
  updateProgress,
};
