import { AvatarCategoryType } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { deleteImageFromSupabase } from "../../../utils/UploadFileToSupabase";

import AppError from "../../Errors/AppError";
import {
  CreateAssetInput,
  CreateAvatarInput,
  CreateCategoryInput,
  CreateStyleInput,
} from "./avatar.validation";



const createAvatar = async (
  payload: CreateAvatarInput & { avatarImgUrl?: string; avatarImgPath?: string }
) => {
  return prisma.avatar.create({
    data: {
      avatarImgUrl: payload.avatarImgUrl,
      avatarImgPath: payload.avatarImgPath,
      gender: payload.gender,
      origin: payload.origin,
      region: payload.region,
      description: payload.description,
      price: payload.price ?? 0,
    },
  });
};

const createCategory = async (avatarId: string, payload: CreateCategoryInput) => {
  const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } });
  if (!avatar) throw new AppError(404, "Avatar not found");

  // prevent duplicate HAIR for same avatar
  const existing = await prisma.avatarCategory.findUnique({
    where: {
      avatarId_name: {
        avatarId,
        name: payload.name  as AvatarCategoryType,  // AvatarCategoryType
      },
    },
  });
  if (existing) {
    throw new AppError(409, "Category already exists for this avatar");
  }

  return prisma.avatarCategory.create({
    data: {
      avatarId,
      name: payload.name as AvatarCategoryType, 
    },
  });
};


const createStyle = async (categoryId: string, payload: CreateStyleInput) => {
  const category = await prisma.avatarCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(404, "Avatar category not found");

  return prisma.assetStyle.create({
    data: {
      categoryId,
      styleName: payload.styleName,
      description: payload.description,
    },
  });
};

const createAsset = async (
  styleId: string,
  payload: CreateAssetInput & { assetImage?: string; assetImgPath?: string }
) => {
  const style = await prisma.assetStyle.findUnique({ where: { id: styleId } });
  if (!style) throw new AppError(404, "Style not found");

  return prisma.asset.create({
    data: {
      styleId,
      assetImage: payload.assetImage!,
      assetImgPath: payload.assetImgPath,
      colorName: payload.colorName,
      gender: payload.gender,
      rarity: payload.rarity,
      price: payload.price ?? 0,
      isStarter: payload.isStarter ?? false,
    },
  });
};



const deleteAssetInternal = async (assetId: string) => {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError(404, "Asset not found");

 
  if (asset.assetImgPath) {
    try {
      await deleteImageFromSupabase(asset.assetImgPath);
    } catch (e:any) {
      console.error("Supabase asset delete failed:", e);
     throw new AppError(400,e.message || e.data.message ||  "Asset image delete failed");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.childAsset.deleteMany({ where: { assetId } });
    await tx.notification.deleteMany({ where: { assetId } });

    await tx.asset.delete({ where: { id: assetId } });
  });

  return assetId;
};

const deleteStyleInternal = async (styleId: string) => {
  const style = await prisma.assetStyle.findUnique({
    where: { id: styleId },
    include: {
      colors: true, 
    },
  });

  if (!style) throw new AppError(404, "Style not found");

  for (const asset of style.colors) {
    await deleteAssetInternal(asset.id);
  }

  await prisma.assetStyle.delete({ where: { id: styleId } });

  return styleId;
};

const deleteCategoryInternal = async (categoryId: string) => {
  const category = await prisma.avatarCategory.findUnique({
    where: { id: categoryId },
    include: {
      styles: {
        include: {
          colors: true,
        },
      },
    },
  });

  if (!category) throw new AppError(404, "Avatar category not found");

  for (const style of category.styles) {
    await deleteStyleInternal(style.id);
  }

  await prisma.avatarCategory.delete({ where: { id: categoryId } });

  return categoryId;
};

const deleteAvatarInternal = async (avatarId: string) => {
  const avatar = await prisma.avatar.findUnique({
    where: { id: avatarId },
    include: {
      categories: {
        include: {
          styles: {
            include: {
              colors: true,
            },
          },
        },
      },
      ownerships: true,    // ChildAvatar[]
      childProfiles: true, // ChildProfile[]
    },
  });

  if (!avatar) throw new AppError(404, "Avatar not found");

  // super delete avatar image
  if (avatar.avatarImgPath) {
    try {
      await deleteImageFromSupabase(avatar.avatarImgPath);
    } catch (e) {
      console.error("Supabase avatar delete failed:", e);
    }
  }

  // delete nested categories/styles/assets
  for (const category of avatar.categories) {
    await deleteCategoryInternal(category.id);
  }

  // clean references + delete avatar row
  await prisma.$transaction(async (tx) => {
    await tx.childProfile.updateMany({
      where: { avatarId },
      data: { avatarId: null },
    });

    await tx.childAvatar.deleteMany({
      where: { avatarId },
    });

    await tx.avatar.delete({ where: { id: avatarId } });
  });

  return avatarId;
};

// ---------- PUBLIC DELETE METHODS ----------

const deleteAsset = async (assetId: string) => {
  const id = await deleteAssetInternal(assetId);
  return { id };
};

const deleteStyle = async (styleId: string) => {
  const id = await deleteStyleInternal(styleId);
  return { id };
};

const deleteCategory = async (categoryId: string) => {
  const id = await deleteCategoryInternal(categoryId);
  return { id };
};

const deleteAvatar = async (avatarId: string) => {
  const id = await deleteAvatarInternal(avatarId);
  return { id };
};

export const AvatarService = {

  createStyle,
  createAsset,
  createAvatar,
  createCategory,

  deleteAvatar,
  deleteCategory,
  deleteStyle,
  deleteAsset,
};
