import { UserRole } from "@prisma/client";
import express from "express";
import RoleValidation from "../../middlewares/RoleValidation";
import validateJSON from "../../middlewares/ValidationParser";
import { PostController } from "./post.controller";
import { createCommentSchema, createPostSchema, updatePostSchema } from "./post.validation";

const router = express.Router();

router.post(
  "/",
  RoleValidation(UserRole.PARENT, UserRole.CHILD),
  validateJSON(createPostSchema),
  PostController.createPost
);

router.get(
  "/",
  RoleValidation(UserRole.PARENT, UserRole.CHILD, UserRole.ADMIN),
  PostController.listPosts
);

router.get(
  "/:postId",
  RoleValidation(UserRole.PARENT, UserRole.CHILD, UserRole.ADMIN),
  PostController.getPost
);

router.patch(
  "/:postId",
  RoleValidation(UserRole.PARENT, UserRole.CHILD, UserRole.ADMIN),
  validateJSON(updatePostSchema),
  PostController.updatePost
);

router.delete(
  "/:postId",
  RoleValidation(UserRole.PARENT, UserRole.CHILD, UserRole.ADMIN),
  PostController.deletePost
);

router.post(
  "/:postId/comments",
  RoleValidation(UserRole.PARENT, UserRole.CHILD),
  validateJSON(createCommentSchema),
  PostController.addComment
);

router.get(
  "/:postId/comments",
  RoleValidation(UserRole.PARENT, UserRole.CHILD, UserRole.ADMIN),
  PostController.listComments
);

router.delete(
  "/comments/:commentId",
  RoleValidation(UserRole.PARENT, UserRole.CHILD, UserRole.ADMIN),
  PostController.deleteComment
);

export const PostRoutes = router;

