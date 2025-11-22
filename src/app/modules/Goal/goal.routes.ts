import { UserRole } from "@prisma/client";
import { Router } from "express";

import RoleValidation from "../../middlewares/RoleValidation";
import validateJSON from "../../middlewares/ValidationParser";
import { GoalController } from "./goal.controller";
import { createGoalSchema, updateGoalSchema } from "./goal.validation";

const router = Router();

router.post(
  "/create-goal",
  RoleValidation(UserRole.PARENT, UserRole.CHILD),
  validateJSON(createGoalSchema),
  GoalController.createGoal
);

router.patch(
  "/update-goal",
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

export const GoalRoutes = router;
