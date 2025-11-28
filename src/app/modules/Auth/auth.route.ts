import { UserRole } from "@prisma/client";
import express from "express";
import RoleValidation from "../../middlewares/RoleValidation";
import { UserController } from "./auth.controller";

import { upload } from "../../middlewares/upload";
import validateFormData from "../../middlewares/ValidationFormdataParser";
import validateResource from "../../middlewares/ValidationParser";
import {
  changePasswordSchema,
  createChildSchema,
  createUserSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  updateChildSchema,
  updateParentSchema
} from "./auth.validation";

const router = express.Router();


router.post(
  "/create-parent",
  validateResource(createUserSchema),
  UserController.createUser
);

router.post(
  "/create-child",
  RoleValidation(UserRole.PARENT),
  upload.single("file"),                   // MUST COME BEFORE validateFormData
  validateFormData(createChildSchema),
  UserController.createChild
);


router.patch(
  "/update-child/:childId",
  RoleValidation(UserRole.CHILD),
  upload.single("file"),
  validateFormData(updateChildSchema),
  UserController.updateChild
);


router.patch(
  "/update-parent/:parentId",
  RoleValidation(UserRole.PARENT),
  upload.single("file"),
  validateFormData(updateParentSchema),
  UserController.updateParent
);


router.post("/resend-otp", UserController.resendOtp);
router.post("/verify-otp", UserController.verifyOtp);

router.post(
  "/login",
  validateResource(loginSchema),
  UserController.loginUser
);

router.post(
  "/refresh-token",
  RoleValidation(UserRole.CHILD, UserRole.PARENT, UserRole.ADMIN),
  UserController.refreshToken
);

router.post(
  "/reset-password",
  validateResource(resetPasswordSchema),
  UserController.resetPassword
);

router.post(
  "/request-reset-password",
  validateResource(requestPasswordResetSchema),
  UserController.requestPasswordReset
);

router.post(
  "/change-password",
  validateResource(changePasswordSchema),
  RoleValidation(UserRole.PARENT, UserRole.ADMIN, UserRole.CHILD),
  UserController.changePassword
);


router.get(
  "/get-all-child",
  RoleValidation(UserRole.PARENT),
  UserController.getAllChild
);

router.get(
  "/get-profile",
  RoleValidation(UserRole.PARENT, UserRole.CHILD, UserRole.ADMIN),
  UserController.getProfile
);

router.get(
  "/get-all-siblings",
  RoleValidation(UserRole.CHILD),
  UserController.getAllSiblings
);

router.delete(
  "/delete-child/:childId",
  RoleValidation(UserRole.PARENT),
  UserController.deleteChild
);

router.delete(
  "/delete-parent",
  RoleValidation(UserRole.PARENT),
  UserController.deleteParent
);

export const AuthRoutes = router;
