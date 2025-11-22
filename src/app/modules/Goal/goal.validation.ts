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
  description: z.string(),

  type: GoalTypeEnum.default("ONE_TIME"),

  status: GoalStatusEnum.default("ACTIVE"),

  rewardCoins: z.number().default(0),

  startDate: z.string(),
  endDate: z.string().optional(),
  durationMin: z.number(),

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
  assignedChildIds: z.array(z.string().uuid()).optional(),
  isDeleted: z.boolean().optional(),
  progress: z.number().optional(),
});


export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
