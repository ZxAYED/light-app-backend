import { GoalStatus, GoalType } from "@prisma/client";
import * as z from "zod";

export const createGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),

  type: z.nativeEnum(GoalType),
  status: z.nativeEnum(GoalStatus).optional(),

  rewardCoins: z.number().min(0),
  durationMin: z.number().min(1),

  startDate: z.string().optional(),
  endDate: z.string().optional(),

  assignedChildIds: z.array(z.string()).min(1),

  isRecurring: z.boolean().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),

  type: z.nativeEnum(GoalType).optional(),
  status: z.nativeEnum(GoalStatus).optional(),

  rewardCoins: z.number().min(0).optional(),
  durationMin: z.number().min(1).optional(),

  startDate: z.string().optional(),
  endDate: z.string().optional(),

  assignedChildIds: z.array(z.string()).optional(),

  isDeleted: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const updateProgressSchema = z.object({
  minutesCompleted: z.number().min(1),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
