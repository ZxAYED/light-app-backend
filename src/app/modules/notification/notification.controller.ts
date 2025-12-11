import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import status from "http-status";
import { NotificationService } from "./notification.service";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getAllNotificationFromDB(req.query);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Notification list fetched successfully",
    data: result,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getSingleNotificationFromDB(req.params.id);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Notification fetched successfully",
    data: result,
  });
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.postNotificationIntoDB(req.body);
  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Notification created successfully",
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const payload = { id: req.params.id, ...req.body };
  const result = await NotificationService.updateNotificationIntoDB(payload);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Notification updated successfully",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await NotificationService.deleteNotificationFromDB(req.params.id);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Notification deleted successfully",
    data: null,
  });
});

export const NotificationController = {
  getAll,
  getById,
  create,
  update,
  remove,
};
