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


  if (req?.file) {
    try {
      const ImageName = `Image-${Date.now()}`;
      const { url: imageLink, path: imagePath } = await uploadImageToSupabase(req.file, ImageName);


      req.body.image = imageLink;
      req.body.imagePath = imagePath;

      await fs.unlink(req.file.path).catch((err) => {
        if (err) {
          console.error("❌ Error deleting local file:", err.message || err);
        }
      });
    } catch (err) {
      console.error("❌ Upload error:", err);
      res.status(500).json({ success: false, message: "fetch failed" });
    }
  }
  const result = await UserService.createChild(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Child Registration Successful. Please verify your email.",
    data: result,
  });
});
const updateChild: RequestHandler = catchAsync(async (req, res) => {

  const email = (req as Request & { user?: any }).user.email;
  const isUserExist = await prisma.user.findFirst({
    where: { email },
  });

  if (isUserExist) {
    throw new AppError(status.CONFLICT, "User Already Exists");
  }
  if (req?.file) {
    try {

      const oldImage = await prisma.childProfile.findUnique({
        where: { userId: isUserExist!.id },
      });
      const oldPath = oldImage?.imagePath

      const ImageName = `Image-${Date.now()}`;
      let imageLink = "";
      let imagePath = "";
      if (oldPath) {
        const { url: imageLink, path: imagePath } = await uploadImageToSupabase(req.file, ImageName, oldPath);
      }
      else {
        const { url: imageLink, path: imagePath } = await uploadImageToSupabase(req.file, ImageName);
      }



      req.body.image = imageLink;
      req.body.imagePath = imagePath;

      await fs.unlink(req.file.path).catch((err) => {
        if (err) {
          console.error("❌ Error deleting local file:", err.message || err);
        }
      });
    } catch (err) {
      console.error("❌ Upload error:", err);
      res.status(500).json({ success: false, message: "fetch failed" });
    }
  }
  const result = await UserService.createChild(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Child Registration Successful. Please verify your email.",
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
  updateChild
};
