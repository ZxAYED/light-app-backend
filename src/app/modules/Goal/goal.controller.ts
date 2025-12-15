import { User } from "@prisma/client";
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import AppError from "../../Errors/AppError";
import { GoalService } from "./goal.service";

export const GoalController = {
  startTask: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const { goalId } = req.params;
    if (!goalId) throw new AppError(400, "Goal ID missing");
    const result = await GoalService.startTask({ goalId, userId: req.user.id });
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Task started. It will auto-complete after the required duration.",
      data: result,
    });
  }),

  createGoal: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const payload = {
      ...req.body,
      authorId: req.user.id,
      authorRole: req.user.role,
    };

    const result = await GoalService.createGoal(payload);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Goal created successfully",
      data: result,
    });
  }),

  updateGoal: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const { goalId } = req.params;
    if (!goalId) throw new AppError(400, "Goal ID missing");

    const payload = {
      ...req.body,
      goalId,
      authorId: req.user.id,
      authorRole: req.user.role,
    };

    const result = await GoalService.updateGoal(payload);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Goal updated successfully",
      data: result,
    });
  }),

  getParentGoals: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await GoalService.getParentGoals(req.user.id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Parent goals fetched successfully",
      data: result,
    });
  }),

  getChildGoals: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await GoalService.getChildGoals(req.user.id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Child goals fetched successfully",
      data: result,
    });
  }),

  updateProgress: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const { goalId } = req.params;
    if (!goalId) throw new AppError(400, "Goal ID missing");

    const payload = {
      goalId,
      userId: req.user.id,
      ...req.body,
    };

    const result = await GoalService.updateProgress(payload);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Progress updated successfully",
      data: result,
    });
  }),
};
