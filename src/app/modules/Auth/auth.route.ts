import { UserRole } from "@prisma/client";
import express from "express";
import RoleValidation from "../../middlewares/RoleValidation";
import { UserController } from "./auth.controller";

import { upload } from "../../middlewares/upload";
import validateResource from "../../middlewares/ValidationParser";
import { changePasswordSchema, createChildSchema, createUserSchema, loginSchema, requestPasswordResetSchema, resetPasswordSchema } from "./auth.validation";

const router = express.Router();

router.post("/create-parent", validateResource(createUserSchema), UserController.createUser);
router.post("/create-child", RoleValidation(UserRole.PARENT), validateResource(createChildSchema),   upload.single("file")
, upload.single("file") ,UserController.createChild);
router.patch("/update-child", RoleValidation(UserRole.CHILD), validateResource(createChildSchema),  upload.single("file")
, upload.single("file"),UserController.updateChild);


router.post("/resend-otp",  UserController.resendOtp);
router.post("/verify-otp", UserController.verifyOtp);
router.post("/login",validateResource(loginSchema), UserController.loginUser);
router.post("/refresh-token", UserController.refreshToken);
router.post("/reset-password", validateResource(resetPasswordSchema),  UserController.resetPassword);
router.post("/request-reset-password", validateResource(requestPasswordResetSchema), UserController.requestPasswordReset);
router.post(
  "/change-password", 
  validateResource(changePasswordSchema),
  RoleValidation(UserRole.PARENT, UserRole.ADMIN, UserRole.CHILD),
  UserController.changePassword
);

export const AuthRoutes = router;
