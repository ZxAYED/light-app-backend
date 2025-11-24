import { Router } from "express";
import RoleValidation from "../../middlewares/RoleValidation";
import validateJSON from "../../middlewares/ValidationParser";

import { UserRole } from "@prisma/client";
import { GoalController } from "./goal.controller";
import { createGoalSchema, updateGoalSchema, updateProgressSchema } from "./goal.validation";

const router = Router();

router.post(
  "/create-goal",
  RoleValidation(UserRole.PARENT, UserRole.CHILD),
  validateJSON(createGoalSchema),
  GoalController.createGoal
);

router.patch(
  "/update-goal/:goalId",
  RoleValidation(UserRole.PARENT, UserRole.CHILD),
  validateJSON(updateGoalSchema),
  GoalController.updateGoal
);

router.get(
  "/parent-goals",
  RoleValidation(UserRole.PARENT),
  GoalController.getParentGoals
);

router.get(
  "/child-goals",
  RoleValidation(UserRole.CHILD),
  GoalController.getChildGoals
);

router.patch(
  "/update-progress/:goalId",
  RoleValidation(UserRole.CHILD),
  validateJSON(updateProgressSchema),
  GoalController.updateProgress
);

export const GoalRoutes = router;
