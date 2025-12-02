import { Request, RequestHandler, Response } from "express";
import status from "http-status";
import { uploadImageToSupabase } from "../../../utils/UploadFileToSupabase";

import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import AppError from "../../Errors/AppError";
import { AvatarService } from "./avatar.service";



const createAvatar: RequestHandler = catchAsync(async (req, res) => {
  const payload = { ...req.body };

  if (!req.file) {
    throw new AppError(400, "Image is required");
  }

  try {
    const ImageName = `avatar-${Date.now()}`;
    const { url, path } = await uploadImageToSupabase(req.file, ImageName);
    payload.avatarImgUrl = url;
    payload.avatarImgPath = path;
  } catch (err: any) {
    console.log(err);
    throw new AppError(400, err.message || err.data?.message || "Image upload failed");
  }

  const result = await AvatarService.createAvatar(payload);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Avatar created successfully",
    data: result,
  });
});

const createCategory: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const { avatarId } = req.params;
  const payload = req.body;

  const result = await AvatarService.createCategory(avatarId, payload);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const createStyle: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const payload = req.body;

  const result = await AvatarService.createStyle(categoryId, payload);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Style created successfully",
    data: result,
  });
});

const createAsset: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const { styleId } = req.params;
  const payload = { ...req.body };

  if (!req.file) {
    throw new AppError(400, "Image is required");
  }

  try {
    const assetName = `asset-${Date.now()}`;
    const { url, path } = await uploadImageToSupabase(req.file, assetName);
    payload.assetImage = url;
    payload.assetImgPath = path;
  } catch (err: any) {
    console.log(err);
    throw new AppError(400, err.message || err.data?.message || "Image upload failed");
  }

  const result = await AvatarService.createAsset(styleId, payload);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Asset created successfully",
    data: result,
  });
});



const deleteAvatar: RequestHandler = catchAsync(async (req, res) => {
  const { avatarId } = req.params;

  const result = await AvatarService.deleteAvatar(avatarId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Avatar deleted successfully",
    data: result,
  });
});

const deleteCategory: RequestHandler = catchAsync(async (req, res) => {
  const { categoryId } = req.params;

  const result = await AvatarService.deleteCategory(categoryId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});

const deleteStyle: RequestHandler = catchAsync(async (req, res) => {
  const { styleId } = req.params;

  const result = await AvatarService.deleteStyle(styleId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Style deleted successfully",
    data: result,
  });
});

const deleteAsset: RequestHandler = catchAsync(async (req, res) => {
  const { assetId } = req.params;

  const result = await AvatarService.deleteAsset(assetId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Asset deleted successfully",
    data: result,
  });
});

export const AvatarController = {

  createCategory,
  createStyle,
  createAsset,
  createAvatar,
 
  deleteAvatar,
  deleteCategory,
  deleteStyle,
  deleteAsset,
};
