import express from "express";
import { NotificationController } from "./notification.controller";
import RoleValidation from "../../middlewares/RoleValidation";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get("/", RoleValidation(UserRole.ADMIN), NotificationController.getAll);
router.get("/:id", RoleValidation(UserRole.ADMIN), NotificationController.getById);
router.post("/", RoleValidation(UserRole.ADMIN), NotificationController.create);
router.put("/:id", RoleValidation(UserRole.ADMIN), NotificationController.update);
router.delete("/:id", RoleValidation(UserRole.ADMIN), NotificationController.remove);

router.post("/push/register", RoleValidation(UserRole.PARENT, UserRole.CHILD), NotificationController.registerToken);
router.post("/push/unregister", RoleValidation(UserRole.PARENT, UserRole.CHILD), NotificationController.unregisterToken);

router.get("/feed", RoleValidation(UserRole.PARENT, UserRole.CHILD), NotificationController.listFeed);
router.post("/send", RoleValidation(UserRole.PARENT, UserRole.ADMIN), NotificationController.sendNow);
router.post("/:id/read", RoleValidation(UserRole.PARENT, UserRole.CHILD), NotificationController.markRead);
router.post("/read-all", RoleValidation(UserRole.PARENT, UserRole.CHILD), NotificationController.markAllRead);

export const NotificationRoutes = router;
