import express from "express";
import { NotificationController } from "./notification.controller";

const router = express.Router();

router.get("/", NotificationController.getAll);
router.get("/:id", NotificationController.getById);
router.post("/", NotificationController.create);
router.put("/:id", NotificationController.update);
router.delete("/:id", NotificationController.remove);

export const NotificationRoutes = router;
