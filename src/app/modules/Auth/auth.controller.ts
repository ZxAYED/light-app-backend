import { User } from "@prisma/client";
import { Request, RequestHandler } from "express";
import fs from 'fs/promises';
import status from "http-status";
import catchAsync from "../../../shared/catchAsync";
import prisma from "../../../shared/prisma";
import sendResponse from "../../../shared/sendResponse";
import { uploadImageToSupabase } from "../../../utils/UploadFileToSupabase";
import AppError from "../../Errors/AppError";
import { UserService } from "./auth.service";

const createUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.createUser(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "OTP has been sent to your email. Please verify your email.",
    data: result,
  });
});
const createChild: RequestHandler = catchAsync(async (req, res) => {
  const payload = { ...req.body };
  payload.userId = (req as Request & { user?: User }).user?.id;
  if (!payload.userId) {
    throw new AppError(status.UNAUTHORIZED, "Unauthorized access");
  }

  if (req?.file) {
    try {
      const ImageName = `Image-${Date.now()}`;
      const { url: imageLink, path: imagePath } = await uploadImageToSupabase(req.file, ImageName);
      payload.image = imageLink;
      payload.imagePath = imagePath;

      await fs.unlink(req.file.path).catch((err) => {
        if (err) {
          console.error("❌ Error deleting local file:", err.message || err);
        }
      });
    } catch (err) {
      console.error("❌ Upload error:", err);
      res.status(500).json({ success: false, message: "Image upload failed" });
    }
  }

  const result = await UserService.createChild(payload);


  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Child Registration Successful.",
    data: result,
  });
});
const updateChild: RequestHandler = catchAsync(async (req, res) => {

  const { childId } = req.query;
req.body.childId = childId

  if (req?.file) {
    try {
      const childProfile = await prisma.childProfile.findFirst({
        where: { id: childId as string },
      });
      if (!childProfile) {
        throw new AppError(status.NOT_FOUND, "Child not found");
      }

      const oldPath = childProfile?.imagePath
      const ImageName = `Image-${Date.now()}`;

      if (oldPath) {
        const { url: imageLink, path: imagePath } = await uploadImageToSupabase(req.file, ImageName, oldPath);
        req.body.image = imageLink;
        req.body.imagePath = imagePath;
      }
      else {
        const { url: imageLink, path: imagePath } = await uploadImageToSupabase(req.file, ImageName);
        req.body.image = imageLink;
        req.body.imagePath = imagePath;
      }

      await fs.unlink(req.file.path).catch((err) => {
        if (err) {
          console.error("❌ Error deleting local file:", err.message || err);
        }
      });
    } catch (err) {
      console.error("❌ Upload error:", err);
      res.status(500).json({ success: false, message: "Child Update failed" });
    }
  }
  const result = await UserService.updateChild(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Child updated successfully.",
    data: result,
  });
});
const resendOtp: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.resendOtp(req.body.email);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "OTP resent successfully.",
    data: result,
  });
});
const verifyOtp: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.verifyOtp(req.body.email, req.body.otp);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "OTP verified successfully.",
    data: result,
  });
});
const changePassword: RequestHandler = catchAsync(async (req: Request & { user?: any }, res) => {

  const payload = {
    ...req.body,
    id: req.user?.id
  }


  const result = await UserService.changePassword(payload);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Password changed successfully.",
    data: result,
  });
});

const loginUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.loginUser(req.body);
  const { refreshToken, ...others } = result;

  res.cookie("refreshToken", refreshToken, {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User Login Successful.",
    data: result,
  });
});

const refreshToken: RequestHandler = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  console.log({ refreshToken });

  const result = await UserService.refreshAccessToken(refreshToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Access token refreshed successfully.",
    data: result,
  });
});


const requestPasswordReset: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.requestPasswordReset(req.body.email);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Password reset OTP sent successfully.",
    data: result,
  });
});
const resetPassword: RequestHandler = catchAsync(async (req, res) => {



  const result = await UserService.resetPassword(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Password reset successfully.",
    data: result,
  });
});
const getAllChild: RequestHandler = catchAsync(async (req: Request & { user?: User } , res) => {
  const result = await UserService.getAllChild(req.user?.id!);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Children retrieved successfully.",
    data: result,
  });
});



export const UserController = {
  createUser,
  loginUser,
  refreshToken,
  resendOtp,
  verifyOtp,
  changePassword,
  requestPasswordReset,
  resetPassword,
  createChild,
  updateChild,
  getAllChild
};
