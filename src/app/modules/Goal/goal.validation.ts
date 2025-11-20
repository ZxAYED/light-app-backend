import { z } from "zod";

export const GoalStatusEnum = z.enum([
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);

export const GoalTypeEnum = z.enum([
  "ONE_TIME",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
]);

export const createGoalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),

  type: GoalTypeEnum.default("ONE_TIME"),

  status: GoalStatusEnum.default("ACTIVE"),

  rewardCoins: z.number().default(0),

  startDate: z.string().optional(),
  endDate: z.string().optional(),
  durationMin: z.number().optional(),

  assignedChildren: z.array(z.string().uuid()).min(1, "At least one child required"),
});

export const updateGoalSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: GoalStatusEnum.optional(),
  type: GoalTypeEnum.optional(),
  rewardCoins: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  durationMin: z.number().optional(),
});
