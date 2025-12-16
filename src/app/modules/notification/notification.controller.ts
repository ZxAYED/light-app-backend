import { UserRole } from "@prisma/client";
import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../../shared/catchAsync";
import prisma from "../../../shared/prisma";
import sendResponse from "../../../shared/sendResponse";
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

const registerToken = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const { token, platform } = req.body || {};
  if (!token || !platform) {
    sendResponse(res, { statusCode: status.BAD_REQUEST, success: false, message: "token and platform required", data: null });
    return;
  }
  let derivedUserId: string | undefined;
  let derivedChildId: string | undefined;
  if (req.user?.role === UserRole.PARENT) {
    derivedUserId = req.user.id;
  } else if (req.user?.role === UserRole.CHILD) {
    const child = await prisma.childProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!child) {
      sendResponse(res, { statusCode: status.BAD_REQUEST, success: false, message: "Child profile not found", data: null });
      return;
    }
    derivedChildId = child.id;
  }
  const result = await NotificationService.registerPushToken({ token, platform, userId: derivedUserId, childId: derivedChildId });
  sendResponse(res, { statusCode: status.OK, success: true, message: "Push token registered", data: result });
});

const unregisterToken = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.body || {};
  if (!token) {
    sendResponse(res, { statusCode: status.BAD_REQUEST, success: false, message: "token required", data: null });
    return;
  }
  const exists = await prisma.pushToken.findUnique({ where: { token } });
  if (!exists) {
    sendResponse(res, { statusCode: status.NOT_FOUND, success: false, message: "token not found", data: null });
    return;
  }
  const result = await NotificationService.unregisterPushToken(token);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Push token unregistered", data: result });
});

const sendNow = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const { type, title, message, childId, parentUserId, data } = req.body || {};
  if (!type || !title || !message) {
    sendResponse(res, { statusCode: status.BAD_REQUEST, success: false, message: "type, title, message required", data: null });
    return;
  }
  const result = await NotificationService.createAndSendNow({ type, title, message, childId, parentUserId, data });
  sendResponse(res, { statusCode: status.CREATED, success: true, message: "Notification sent", data: result });
});

const listFeed = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  console.log(req.user)
  const result = await NotificationService.listFeedForUser(req.user, req.query);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Notification feed fetched", data: result });
});

const markRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markRead(req.params.id);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Notification marked read", data: result });
});

const markAllRead = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  let payload: { childId?: string; parentUserId?: string } = {};
  if (req.user?.role === UserRole.PARENT) {
    payload.parentUserId = req.user.id;
  } else if (req.user?.role === UserRole.CHILD) {
    const child = await prisma.childProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!child) {
      sendResponse(res, { statusCode: status.BAD_REQUEST, success: false, message: "Child profile not found", data: null });
      return;
    }
    payload.childId = child.id;
  }
  const result = await NotificationService.markAllRead(payload);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Notifications marked read", data: result });
});

export const NotificationController = {
  getAll,
  getById,
  create,
  update,
  remove,
  registerToken,
  unregisterToken,
  sendNow,
  listFeed,
  markRead,
  markAllRead,
};
