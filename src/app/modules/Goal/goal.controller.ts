import { User } from "@prisma/client";
import { Request } from "express";
import status from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { GoalService } from "./goal.service";

export const GoalController = {
  createGoal: catchAsync(async (req: Request & { user?: User }, res) => {
    const authorId  = req.user?.id;
    req.body.authorId=authorId
    req.body.authorRole=req.user?.role
    const result = await GoalService.createGoal( req.body);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Goal created successfully",
      data: result,
    });
  }),

  updateGoal: catchAsync(async (req: Request & { user?: User }, res) => {
    
    req.body.authorId =  req.user?.id;
    req.body.authorRole = req.user?.role;
    req.body.goalId = req.query.goalId as string;


    const result = await GoalService.updateGoal(req.body );

      sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Goal updated successfully",
      data: result,
    });
  }),

  getParentGoals: catchAsync(async (req: Request & { user?: User }, res) => {
    const parentId = req.user?.id;
    const result = await GoalService.getParentGoals(parentId!);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Parent goals fetched",
      data: result,
    });
  }),

  getChildGoals: catchAsync(async (req, res) => {
    const childId = req.query.childId as string;
    const result = await GoalService.getChildGoals(childId);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Child goals fetched",
      data: result,
    });
  }),
};
