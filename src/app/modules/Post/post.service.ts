import { AuthorRole, UserRole } from "@prisma/client";
import { paginationHelper } from "../../../helpers/paginationHelper";
import prisma from "../../../shared/prisma";
import AppError from "../../Errors/AppError";
import { CreateCommentInput, CreatePostInput, UpdatePostInput } from "./post.validation";

export const PostService = {
  createPost: async (payload: CreatePostInput & { authorId: string; authorRole: UserRole }) => {
    return prisma.post.create({
      data: {
        authorId: payload.authorId,
        authorRole: payload.authorRole as AuthorRole,
        title: payload.title,
        content: payload.content,
        description: payload.description,
      },
    });
  },

  listPosts: async (query: any) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(query);
    const where: any = {};
    if (query.authorId) where.authorId = String(query.authorId);
    if (query.role) where.authorRole = String(query.role).toUpperCase();

    const total = await prisma.post.count({ where });
    const items = await prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder as any },
      include: {
        _count: { select: { comments: true } },
        author: {
          select: {
            id: true,
            role: true,
            parentProfile: { select: { id: true, name: true, image: true } },
            childProfile: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  getPostById: async (postId: string) => {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: { select: { comments: true } },
        author: {
          select: {
            id: true,
            role: true,
            parentProfile: { select: { id: true, name: true, image: true } },
            childProfile: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
    if (!post) throw new AppError(404, "Post not found");
    return post;
  },

  updatePost: async (
    actor: { id: string; role: UserRole },
    payload: UpdatePostInput & { postId: string }
  ) => {
    const existing = await prisma.post.findUnique({ where: { id: payload.postId } });
    if (!existing) throw new AppError(404, "Post not found");
    if (actor.role !== UserRole.ADMIN && existing.authorId !== actor.id) {
      throw new AppError(403, "Only the author or an admin can update this post");
    }
    const updated = await prisma.post.update({
      where: { id: payload.postId },
      data: {
        title: payload.title,
        content: payload.content,
        description: payload.description,
      },
    });
    return updated;
  },

  deletePost: async (actor: { id: string; role: UserRole }, postId: string) => {
    const existing = await prisma.post.findUnique({ where: { id: postId } });
    if (!existing) throw new AppError(404, "Post not found");
    if (actor.role !== UserRole.ADMIN && existing.authorId !== actor.id) {
      throw new AppError(403, "Only the author or an admin can delete this post");
    }
    await prisma.post.delete({ where: { id: postId } });
    return { id: postId };
  },

  addComment: async (
    actor: { id: string; role: UserRole },
    postId: string,
    input: CreateCommentInput
  ) => {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new AppError(404, "Post not found");
    const created = await prisma.postComment.create({
      data: {
        postId,
        authorId: actor.id,
        authorRole: actor.role as AuthorRole,
        content: input.content,
      },
    });
    const withAuthor = await prisma.postComment.findUnique({
      where: { id: created.id },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            parentProfile: { select: { id: true, name: true, image: true } },
            childProfile: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
    return withAuthor!;
  },

  listComments: async (postId: string, query: any) => {
    const { page, limit, skip } = paginationHelper.calculatePagination(query);
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new AppError(404, "Post not found");

    const where = { postId };
    const total = await prisma.postComment.count({ where });
    const items = await prisma.postComment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            parentProfile: { select: { id: true, name: true, image: true } },
            childProfile: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  deleteComment: async (actor: { id: string; role: UserRole }, commentId: string) => {
    const existing = await prisma.postComment.findUnique({ where: { id: commentId } });
    if (!existing) throw new AppError(404, "Comment not found");
    if (actor.role !== UserRole.ADMIN && existing.authorId !== actor.id) {
      throw new AppError(403, "Forbidden , Only the author or an admin can delete this comment");
    }
    await prisma.postComment.delete({ where: { id: commentId } });
    return { id: commentId };
  },
};
