import { User } from "@prisma/client";
import status from "http-status";
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import AppError from "../../Errors/AppError";
import { PostService } from "./post.service";

export const PostController = {
  createPost: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    const payload = {
      ...req.body,
      authorId: req.user.id,
      authorRole: req.user.role,
    };
    const result = await PostService.createPost(payload);
    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: "Your post has been published.",
      data: result,
    });
  }),

  listPosts: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    const result = await PostService.listPosts(req.query);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Feed loaded successfully.",
      data: result,
    });
  }),

  getPost: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    const { postId } = req.params;
    if (!postId) throw new AppError(status.BAD_REQUEST, "postId missing");
    const result = await PostService.getPostById(postId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Post details fetched.",
      data: result,
    });
  }),

  updatePost: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    const { postId } = req.params;
    if (!postId) throw new AppError(status.BAD_REQUEST, "postId missing");
    const result = await PostService.updatePost(
      { id: req.user.id, role: req.user.role },
      { postId, ...req.body }
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Post updated. Changes are now visible to everyone.",
      data: result,
    });
  }),

  deletePost: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    const { postId } = req.params;
    if (!postId) throw new AppError(status.BAD_REQUEST, "postId missing");
    const result = await PostService.deletePost({ id: req.user.id, role: req.user.role }, postId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Post permanently deleted. All attached comments have been removed.",
      data: result,
    });
  }),

  addComment: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    const { postId } = req.params;
    if (!postId) throw new AppError(status.BAD_REQUEST, "postId missing");
    const result = await PostService.addComment(
      { id: req.user.id, role: req.user.role },
      postId,
      req.body
    );
    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: "Your comment has been added to the post.",
      data: result,
    });
  }),

  listComments: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    const { postId } = req.params;
    if (!postId) throw new AppError(status.BAD_REQUEST, "postId missing");
    const result = await PostService.listComments(postId, req.query);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Comments loaded (sorted by oldest first).",
      data: result,
    });
  }),

  deleteComment: catchAsync(async (req: Request & { user?: User }, res: Response) => {
    if (!req.user) throw new AppError(status.UNAUTHORIZED, "Unauthorized");
    const { commentId } = req.params;
    if (!commentId) throw new AppError(status.BAD_REQUEST, "commentId missing");
    const result = await PostService.deleteComment({ id: req.user.id, role: req.user.role }, commentId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Comment permanently deleted.",
      data: result,
    });
  }),
};
