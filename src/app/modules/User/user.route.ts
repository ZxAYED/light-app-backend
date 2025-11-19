import express from "express";


import { UserRole } from "@prisma/client";
import RoleValidation from "../../middlewares/RoleValidation";
import { UserDataController } from "./user.controller";

const router = express.Router();

router.get("/all-users",  RoleValidation( UserRole.ADMIN),
 UserDataController.getAllUsers);
router.get(
  "/me",
  RoleValidation(UserRole.PARENT, UserRole.ADMIN),
  UserDataController.myProfileInfo
);

export const UserDataRoutes = router;
