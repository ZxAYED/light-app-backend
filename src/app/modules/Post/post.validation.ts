import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().max(120).optional(),
  content: z.string().min(1).max(5000),
  description: z.string().max(500).optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  title: z.string().max(120).optional(),
  content: z.string().min(1).max(5000).optional(),
  description: z.string().max(500).optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
