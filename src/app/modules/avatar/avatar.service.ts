import { AvatarCategoryType, AvatarGender } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { deleteImageFromSupabase } from "../../../utils/UploadFileToSupabase";

import AppError from "../../Errors/AppError";
import {
    CreateAssetInput,
    CreateAvatarInput,
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

      region: payload.region,
      description: payload.description,
      price: payload.price ?? 0,
    },
  });
};


const createStyle = async (payload: CreateStyleInput) => {
  const avatar = await prisma.avatar.findUnique({ where: { id: payload.avatarId } });
  if (!avatar) throw new AppError(404, "Avatar not found");

  let category = await prisma.avatarCategory.findFirst({
    where: {
      avatarId: payload.avatarId,
      type: payload.type,
    },
  });

  if (!category) {
    category = await prisma.avatarCategory.create({
      data: {
        avatarId: payload.avatarId,
        type: payload.type,
      },
    });
  }

  const existingStyle = await prisma.assetStyle.findFirst({
    where: {
      categoryId: category.id,
      styleName: payload.styleName,
    },
  });

  if (existingStyle) {
    throw new AppError(409, "Style already exists for this avatar and category");
  }

  return prisma.assetStyle.create({
    data: {
      categoryId: category.id,
      styleName: payload.styleName,
      description: payload.description,
    },
  });
};

const createAsset = async (
  styleId: string,
  payload: CreateAssetInput & { assetImage: string; assetImgPath?: string }
) => {
  const style = await prisma.assetStyle.findUnique({ where: { id: styleId } });
  if (!style) throw new AppError(404, "Style not found");

  return prisma.asset.create({
    data: {
      styleId,
      assetImage: payload.assetImage,
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
      assetStyles: {
        include: {
          colors: true,
        },
      },
    },
  });

  if (!category) throw new AppError(404, "Avatar category not found");

  for (const style of category.assetStyles) {
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
          assetStyles: {
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

const getAvailableAvatarsForChild = async (
  childUserId: string,
  filters?: { gender?: string; region?: string }
) => {
  const child = await prisma.childProfile.findFirst({
    where: { userId: childUserId },
    select: { id: true },
  });
  if (!child) throw new AppError(404, "Child not found");

  const owned = await prisma.childAvatar.findMany({
    where: { childId: child.id },
    select: { avatarId: true },
  });

  const ownedIds = owned.map((o) => o.avatarId);

  const whereCondition: any = {};

  if (ownedIds.length > 0) {
    whereCondition.id = { notIn: ownedIds };
  }

  if (filters?.gender) {
    whereCondition.gender = filters.gender as AvatarGender;
  }

  if (filters?.region) {
    whereCondition.region = {
      contains: filters.region,
      mode: "insensitive",
    };
  }

  return prisma.avatar.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
  });
};

const getOwnedAvatarsForChild = async (childUserId: string) => {
  const child = await prisma.childProfile.findFirst({
    where: { userId: childUserId },
    select: { id: true },
  });
  if (!child) throw new AppError(404, "Child not found");

  const ownerships = await prisma.childAvatar.findMany({
    where: { childId: child.id },
    include: { avatar: true },
    orderBy: { createdAt: "desc" },
  });

  return ownerships.map((o) => o.avatar);
};

const getAssetsByStyle = async (styleId: string) => {
  const style = await prisma.assetStyle.findUnique({ where: { id: styleId } });
  if (!style) throw new AppError(404, "Style not found");
  return prisma.asset.findMany({
    where: { styleId },
    orderBy: { createdAt: "desc" },
  });
};

const getAssetsByCategoryType = async (type: string) => {
  const raw = (type || "").trim();
  if (!raw) throw new AppError(400, "category type missing");

  const normalized = raw.toUpperCase().replace(/\s+|_/g, "");
  const map: Record<string, AvatarCategoryType> = {
    SKIN: "SKIN",
    HAIR: "HAIR",
    HAIRSTYLE: "HAIR",
    EYES: "EYES",
    NOSE: "NOSE",
    DRESS: "DRESS",
    SHOES: "SHOES",
    ACCESSORY: "ACCESSORY",
    ACCESSORIES: "ACCESSORY",
    JEWELRY: "JEWELRY",
    PET: "PET",
  } as const;

  const categoryType = map[normalized];
  if (!categoryType) {
    throw new AppError(400, `Invalid category type: ${type}`);
  }

  return prisma.asset.findMany({
    where: {
      style: {
        category: {
          type: categoryType,
        },
      },
    },
    include: {
      style: { include: { category: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getCustomizationData = async (childUserId: string, avatarId: string) => {
  const child = await prisma.childProfile.findFirst({
    where: { userId: childUserId },
    select: { id: true },
  });
  if (!child) throw new AppError(404, "Child not found");

  const owns = await prisma.childAvatar.findFirst({
    where: { childId: child.id, avatarId },
  });
  if (!owns) throw new AppError(403, "Avatar not owned by child");

  const avatar = await prisma.avatar.findUnique({
    where: { id: avatarId },
    include: {
      categories: {
        include: {
          assetStyles: {
            include: { colors: true },
          },
        },
      },
    },
  });
  if (!avatar) throw new AppError(404, "Avatar not found");

  const unlockedAssets = await prisma.childAsset.findMany({
    where: { childId: child.id },
    select: { assetId: true },
  });

  const unlockedAssetIds = new Set(unlockedAssets.map((a) => a.assetId));

  const result: Record<string, any> = {
    avatarImgUrl: avatar.avatarImgUrl,
  };

  avatar.categories.forEach((category) => {
    const key = category.type.toLowerCase(); 
    const name = category.type.charAt(0) + category.type.slice(1).toLowerCase(); 

    result[key] = {
      name,
      elements: category.assetStyles.map((style) => ({
        styleName: style.styleName,
        colors: style.colors.map((asset) => ({
          id: asset.id,
          url: asset.assetImage,
          isUnlocked: unlockedAssetIds.has(asset.id),
          price: asset.price,
        })),
      })),
    };
  });

  return result;
};

const saveCustomization = async (
  childUserId: string,
  avatarId: string,
  assetIds: string[]
) => {
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw new AppError(400, "assetIds required");
  }

  return prisma.$transaction(async (tx) => {
    const child = await tx.childProfile.findFirst({
      where: { userId: childUserId },
      select: { id: true },
    });
    if (!child) throw new AppError(404, "Child not found");

    const owns = await tx.childAvatar.findFirst({
      where: { childId: child.id, avatarId },
    });
    if (!owns) throw new AppError(403, "Avatar not owned by child");

    const validAssets = await tx.asset.findMany({
      where: {
        id: { in: assetIds },
        style: { category: { avatarId } },
      },
      select: { id: true },
    });

    if (validAssets.length !== assetIds.length) {
      throw new AppError(400, "One or more assets do not belong to this avatar");
    }

    await tx.childAsset.createMany({
      data: validAssets.map((a) => ({ childId: child.id, assetId: a.id })),
      skipDuplicates: true,
    });

    const unlocked = await tx.childAsset.findMany({
      where: { childId: child.id },
      select: { assetId: true },
    });

    return {
      savedCount: validAssets.length,
      unlockedAssetIds: unlocked.map((a) => a.assetId),
    };
  });
};

const getAssetDetails = async (assetId: string) => {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      style: { include: { category: true } },
    },
  });
  if (!asset) throw new AppError(404, "Asset not found");
  return asset;
};

export const AvatarService = {

  createStyle,

  createAvatar,
  createAsset,
  getAvailableAvatarsForChild,
  getOwnedAvatarsForChild,
  getAssetsByStyle,
  getAssetsByCategoryType,
  getAssetDetails,
  getCustomizationData,
  saveCustomization,
  
  deleteAvatar,
  deleteCategory,
  deleteStyle,
  deleteAsset,
};
