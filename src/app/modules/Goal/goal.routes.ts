// src/app/modules/Goal/goal.routes.ts

import { UserRole } from "@prisma/client";
import { Router } from "express";
import RoleValidation from "../../middlewares/RoleValidation";
import validateJSON from "../../middlewares/ValidationParser";
import { GoalController } from "./goal.controller";
import { createGoalSchema, updateGoalSchema, updateProgressSchema } from "./goal.validation";

const router = Router();

/**
 * CREATE GOAL (Parent or Child)
 */
router.post(
  "/create",
  RoleValidation(UserRole.PARENT, UserRole.CHILD),
  validateJSON(createGoalSchema),
  GoalController.createGoal
);

/**
 * UPDATE GOAL (Edit title, description, status, duration, type)
 */
router.patch(
  "/update/:goalId",
  RoleValidation(UserRole.PARENT, UserRole.CHILD),
  validateJSON(updateGoalSchema),
  GoalController.updateGoal
);

/**
 * UPDATE PROGRESS (Child-only)
 * Body: { minutesCompleted }
 */
router.patch(
  "/progress/:goalId",
  RoleValidation(UserRole.CHILD),
  validateJSON(updateProgressSchema),
  GoalController.updateProgress
);

/**
 * GET ALL GOALS of parent (parent-level view)
 * includes individual child progress
 */
router.get(
  "/parent/list",
  RoleValidation(UserRole.PARENT),
  GoalController.getParentGoals
);

/**
 * GET ALL GOALS of child (child-level view)
 * shows child’s own progress
 */
router.get(
  "/child/list",
  RoleValidation(UserRole.CHILD),
  GoalController.getChildGoals
);

/**
 * GET individual goal details for parent or child
 */
router.get(
  "/details/:goalId",
  RoleValidation(UserRole.PARENT, UserRole.CHILD),
  GoalController.getGoalDetails
);

/**
 * RESET endpoint (daily/weekly/monthly if frontend wants manual reset)
 */
router.post(
  "/reset/:goalId",
  RoleValidation(UserRole.PARENT),
  GoalController.resetGoalForAllChildren
);

export const GoalRoutes = router;
