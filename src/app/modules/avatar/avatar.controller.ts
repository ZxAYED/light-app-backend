import { RequestHandler } from "express";
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



const createStyle: RequestHandler = catchAsync(async (req, res) => {

  const payload = { ...req.body };

  const result = await AvatarService.createStyle( payload);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Style created successfully",
    data: result,
  });
});


const createAsset: RequestHandler = catchAsync(async (req, res) => {
  const anyReq = req as any;
  const body = { ...(anyReq.body || {}) };

  const styleId = body.styleId;
  if (!styleId) {
    throw new AppError(400, "styleId is required in body");
  }

  let file: Express.Multer.File | undefined = anyReq.file;
  if (!file && Array.isArray(anyReq.files) && anyReq.files.length > 0) {
    file = anyReq.files.find((f: Express.Multer.File) => f.fieldname === "file") || anyReq.files[0];
  }

  if (!file) {
    throw new AppError(400, "Image is required");
  }

  const payload = { ...body };

  try {
    const assetName = `asset-${Date.now()}`;
    const { url, path } = await uploadImageToSupabase(file, assetName);
    payload.assetImage = url;
    payload.assetImgPath = path;
  } catch (err: any) {
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



const getAvailableAvatars: RequestHandler = catchAsync(async (req: any, res) => {
  const filters = {
    gender: req.query.gender as string,
    region: (req.query.region as string) || (req.query.origin as string),
  };
  
  const result = await AvatarService.getAvailableAvatarsForChild(req.user.id, filters);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Avatars fetched successfully",
    data: result,
  });
});

const getOwnedAvatars: RequestHandler = catchAsync(async (req: any, res) => {
  
  const result = await AvatarService.getOwnedAvatarsForChild(req.user.id);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Owned avatars fetched successfully",
    data: result,
  });
});

const getAssetsByStyle: RequestHandler = catchAsync(async (req, res) => {
  const { styleId } = req.params;
  if (!styleId) throw new AppError(400, "styleId missing");
  const result = await AvatarService.getAssetsByStyle(styleId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Assets fetched successfully",
    data: result,
  });
});


const getAssetsByCategoryType: RequestHandler = catchAsync(async (req, res) => {
  const { type } = req.params;
  if (!type) throw new AppError(400, "category type missing");
  const result = await AvatarService.getAssetsByCategoryType(type, (req as any).user?.id);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Assets by category fetched successfully",
    data: result,
  });
});

const getAssetDetails: RequestHandler = catchAsync(async (req, res) => {
  const { assetId } = req.params;
  if (!assetId) throw new AppError(400, "assetId missing");
  const result = await AvatarService.getAssetDetails(assetId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Asset details fetched successfully",
    data: result,
  });
});

const getCustomizationData: RequestHandler = catchAsync(async (req: any, res) => {
  const { avatarId } = req.params;
  if (!avatarId) throw new AppError(400, "avatarId missing");
  
  const result = await AvatarService.getCustomizationData(req.user.id, avatarId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Customization data fetched successfully",
    data: result,
  });
});

const saveCustomization: RequestHandler = catchAsync(async (req: any, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const { avatarId, assetIds } = req.body as { avatarId: string; assetIds: string[] };
  if (!avatarId) throw new AppError(400, "avatarId missing in body");
  const result = await AvatarService.saveCustomization(req.user.id, avatarId, assetIds || []);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Customization saved successfully",
    data: result,
  });
});

const purchaseAvatar: RequestHandler = catchAsync(async (req: any, res) => {
  const { avatarId } = req.params;
  if (!avatarId) throw new AppError(400, "avatarId missing");
  const result = await AvatarService.purchaseAvatar(req.user.id, avatarId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Avatar purchased successfully",
    data: result,
  });
});

const unlockAssets: RequestHandler = catchAsync(async (req: any, res) => {
  const { assetIds } = req.body as { assetIds: string[] };
  const result = await AvatarService.unlockAssetsForChild(req.user.id, assetIds || []);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Assets unlocked successfully",
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


  createStyle,
  createAsset,
  
  createAvatar,
  getAvailableAvatars,
  getOwnedAvatars,
  getAssetsByStyle,
  getAssetsByCategoryType,
  getAssetDetails,
  getCustomizationData,
  saveCustomization,
  purchaseAvatar,
  unlockAssets,
  deleteAvatar,
  deleteCategory,
  deleteStyle,
  deleteAsset,
};
