import { z } from "zod";
import { NotificationType, Platform } from "@prisma/client";

export const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.nativeEnum(Platform),
  userId: z.string().uuid().optional(),
  childId: z.string().uuid().optional(),
});
export type RegisterTokenInput = z.infer<typeof registerTokenSchema>;

export const unregisterTokenSchema = z.object({
  token: z.string().min(1),
});
export type UnregisterTokenInput = z.infer<typeof unregisterTokenSchema>;

export const sendNowSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  childId: z.string().uuid().optional(),
  parentUserId: z.string().uuid().optional(),
  data: z.record(z.string()).optional(),
});
export type SendNowInput = z.infer<typeof sendNowSchema>;

export const markAllReadSchema = z.object({
  childId: z.string().uuid().optional(),
  parentUserId: z.string().uuid().optional(),
});
export type MarkAllReadInput = z.infer<typeof markAllReadSchema>;

