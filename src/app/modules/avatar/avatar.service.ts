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
    const err = new AppError(409, "Style already exists for this avatar and category");
    (err as any).data = { categoryId: category.id, style: existingStyle };
    throw err;
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
    } catch (e: any) {
      console.error("Supabase asset image delete failed:", e);
      throw new AppError(400, e.message || e.data.message || "Asset image delete failed");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.childAsset.deleteMany({ where: { assetId } });
    await tx.notification.deleteMany({ where: { assetId } });

    await tx.asset.delete({ where: { id: assetId } });

    // if the style has no more assets, delete the style too
    const remaining = await tx.asset.count({ where: { styleId: asset.styleId } });
    if (remaining === 0) {
      await tx.assetStyle.delete({ where: { id: asset.styleId } });
    }
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
    whereCondition.gender = filters.gender.toUpperCase() as AvatarGender;
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
    // include:{
    //   categories: {
    //     include: {
    //       assetStyles: {
    //         include: {
    //           colors: true,
    //         },
    //       },
    //     },
    //   },
    // }
  });
};

const getOwnedAvatarsForChild = async (childUserId: string) => {
  const child = await prisma.childProfile.findFirst({
    where: { userId: childUserId },
    select: { id: true },
  });
  if (!child) throw new AppError(404, "Child not found");

  let ownerships = await prisma.childAvatar.findMany({
    where: { childId: child.id },
    include: { avatar: true },
    orderBy: { createdAt: "desc" },
  });

  const hasActive = ownerships.some((o) => o.isActive);
  if (!hasActive && ownerships.length > 0) {
    const oldest = await prisma.childAvatar.findFirst({
      where: { childId: child.id },
      orderBy: { createdAt: "asc" },
    });
    if (oldest) {
      await prisma.childAvatar.updateMany({ where: { childId: child.id }, data: { isActive: false } });
      await prisma.childAvatar.update({ where: { id: oldest.id }, data: { isActive: true } });
      ownerships = await prisma.childAvatar.findMany({
        where: { childId: child.id },
        include: { avatar: true },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  const activeOwnership = ownerships.find((o) => o.isActive) || null;
 
  const unequippedAvatars = ownerships.filter((o) => !o.isActive).map((o) => o.avatar);

  const equippedPreset = activeOwnership
    ? await buildPresetSelectedPayload(child.id, activeOwnership.avatarId)
    : null;

  const unequipped = await Promise.all(
    unequippedAvatars.map((a) => buildPresetSelectedPayload(child.id, a.id))
  );

  return { equipped: equippedPreset, unequipped };
};

const getAssetsByStyle = async (styleId: string) => {
  const style = await prisma.assetStyle.findUnique({ where: { id: styleId } });
  if (!style) throw new AppError(404, "Style not found");
  return prisma.asset.findMany({
    where: { styleId },
    orderBy: { createdAt: "desc" },
  });
};

const getAssetsByCategoryType = async (type: string, childUserId?: string) => {
  const raw = (type || "").trim();
  if (!raw) throw new AppError(400, "category type missing");

  let ownedIds: string[] = [];
  if (childUserId) {
    const child = await prisma.childProfile.findFirst({
      where: { userId: childUserId },
      select: { id: true },
    });
    if (!child) throw new AppError(404, "Child not found");
    const ownedAssets = await prisma.childAsset.findMany({
      where: { childId: child.id },
      select: { assetId: true },
    });
    ownedIds = ownedAssets.map((a) => a.assetId);
  }

  const normalized = raw.toUpperCase().replace(/\s+|_/g, "");
  if (normalized === "TRENDING") {
    return prisma.asset.findMany({
      where: ownedIds.length ? { id: { notIn: ownedIds } } : {},
      include: { style: { include: { category: true } } },
      orderBy: [{ purchased: "desc" }, { createdAt: "desc" }],
      take: 10,
    });
  }
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

  const whereFilter = ownedIds.length ? { id: { notIn: ownedIds } } : {};
  return prisma.asset.findMany({
    where: {
      ...whereFilter,
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

const buildCustomizationPayload = async (childId: string, avatarId: string) => {
  const owns = await prisma.childAvatar.findFirst({ where: { childId, avatarId } });
  if (!owns) throw new AppError(403, "Avatar not owned by child");

  const avatar = await prisma.avatar.findUnique({
    where: { id: avatarId },
    include: {
      categories: { include: { assetStyles: { include: { colors: true } } } },
    },
  });
  if (!avatar) throw new AppError(404, "Avatar not found");

  const unlockedAssets = await prisma.childAsset.findMany({
    where: { childId },
    select: { assetId: true },
  });
  const unlockedAssetIds = new Set(unlockedAssets.map((a) => a.assetId));

  const equipped = await prisma.childAvatarEquipped.findMany({
    where: { childAvatarId: owns.id },
    select: { assetId: true },
  });
  const equippedAssetIds = new Set(equipped.map((e) => e.assetId));

  const result: Record<string, any> = {
    avatarId: avatarId,
    avatarImgUrl: avatar.avatarImgUrl,
    gender: avatar.gender,
    region: avatar.region,
  };

  avatar.categories.forEach((category) => {
    const key = category.type.toLowerCase();
    const name = category.type.charAt(0) + category.type.slice(1).toLowerCase();
    const elements = category.assetStyles.map((style) => {
      const colors = style.colors.map((asset) => {
        const isUnlocked = unlockedAssetIds.has(asset.id) || asset.isStarter;
        return {
          id: asset.id,
          url: asset.assetImage,
          isUnlocked,
          isSelected: equippedAssetIds.has(asset.id),
          price: asset.price,
        };
      });
      return { id: style.id, styleName: style.styleName, colors };
    });
    result[key] = elements.length > 0 ? { name, elements } : { name: "null", elements: null };
  });

  const canonical = ["skin","hair","eyes","nose","dress","shoes","accessory","jewelry","pet"];
  for (const k of canonical) {
    if (!(k in result)) {
      result[k] = { name: "null", elements: null };
    }
  }

  return result;
};

const buildPresetPayload = async (childId: string, avatarId: string) => {
  const owns = await prisma.childAvatar.findFirst({ where: { childId, avatarId } });
  if (!owns) throw new AppError(403, "Avatar not owned by child");

  const avatar = await prisma.avatar.findUnique({
    where: { id: avatarId },
    include: { categories: true },
  });
  if (!avatar) throw new AppError(404, "Avatar not found");

  const equipped = await prisma.childAvatarEquipped.findMany({
    where: { childAvatarId: owns.id },
    select: { assetId: true },
  });
  const equippedAssetIds = equipped.map((e) => e.assetId);

  const assets = equippedAssetIds.length
    ? await prisma.asset.findMany({
        where: { id: { in: equippedAssetIds } },
        include: { style: { include: { category: true } } },
      })
    : [];

  const result: Record<string, any> = {
    avatarId: avatarId,
    avatarImgUrl: avatar.avatarImgUrl,
    gender: avatar.gender,
    region: avatar.region,
  };

  for (const asset of assets) {
    const type = asset.style.category.type;
    const key = type.toLowerCase();
    const name = type.charAt(0) + type.slice(1).toLowerCase();
    result[key] = {
      name,
      selected: {
        styleId: asset.style.id,
        styleName: asset.style.styleName,
        assetId: asset.id,
        url: asset.assetImage,
        price: asset.price,
      },
    };
  }

  return result;
};

const buildPresetIndexPayload = async (childId: string, avatarId: string) => {
  const owns = await prisma.childAvatar.findFirst({ where: { childId, avatarId } });
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

  const equipped = await prisma.childAvatarEquipped.findMany({
    where: { childAvatarId: owns.id },
    select: { assetId: true },
  });
  const equippedSet = new Set(equipped.map((e) => e.assetId));

  const result: Record<string, any> = {
    avatarId: avatarId,
    avatarImgUrl: avatar.avatarImgUrl,
    gender: avatar.gender,
    region: avatar.region,
  };

  avatar.categories.forEach((category) => {
    const key = category.type.toLowerCase();
    const name = category.type.charAt(0) + category.type.slice(1).toLowerCase();
    let elementsIndex = -1;
    let colorsIndex = -1;
    for (let si = 0; si < category.assetStyles.length; si++) {
      const style = category.assetStyles[si];
      for (let ci = 0; ci < style.colors.length; ci++) {
        const asset = style.colors[ci];
        if (equippedSet.has(asset.id)) {
          elementsIndex = si;
          colorsIndex = ci;
          break;
        }
      }
      if (elementsIndex !== -1) break;
    }
    result[key] = elementsIndex !== -1 ? { name, elementsIndex, colorsIndex } : null;
  });

  return result;
};

const buildPresetSelectedPayload = async (childId: string, avatarId: string) => {
  const owns = await prisma.childAvatar.findFirst({ where: { childId, avatarId } });
  if (!owns) throw new AppError(403, "Avatar not owned by child");

  const avatar = await prisma.avatar.findUnique({
    where: { id: avatarId },    include: {
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

  const unlockedAssets = await prisma.childAsset.findMany({ where: { childId }, select: { assetId: true } });
  const unlockedIds = new Set(unlockedAssets.map((a) => a.assetId));

  const equipped = await prisma.childAvatarEquipped.findMany({ where: { childAvatarId: owns.id }, select: { assetId: true } });
  const equippedSet = new Set(equipped.map((e) => e.assetId));

  const result: Record<string, any> = {
    avatarId: avatarId,
    avatarImgUrl: avatar.avatarImgUrl,
    gender: avatar.gender,
    region: avatar.region,
  };

  avatar.categories.forEach((category) => {
    const key = category.type.toLowerCase();
    const name = category.type.charAt(0) + category.type.slice(1).toLowerCase();
    let payload: any = null;
    for (let si = 0; si < category.assetStyles.length; si++) {
      const style = category.assetStyles[si];
      for (let ci = 0; ci < style.colors.length; ci++) {
        const asset = style.colors[ci];
        if (equippedSet.has(asset.id)) {
          const color = {
            id: asset.id,
            url: asset.assetImage,
            isUnlocked: unlockedIds.has(asset.id) || asset.isStarter,
            isSelected: true,
            price: asset.price,
          };
          payload = { name, elements: [{ id: style.id, styleName: style.styleName, colors: [color] }] };
          break;
        }
      }
      if (payload) break;
    }
    result[key] = payload ? payload : { name: "null", elements: null };
  });

  const canonical = ["skin","hair","eyes","nose","dress","shoes","accessory","jewelry","pet"];
  for (const k of canonical) {
    if (!(k in result)) {
      result[k] = { name: "null", elements: null };
    }
  }

  return result;
};

const getCustomizationData = async (
  childUserId: string,
  avatarId: string,
) => {
  const child = await prisma.childProfile.findFirst({
    where: { userId: childUserId },
    select: { id: true },
  });
  if (!child) throw new AppError(404, "Child not found");
  return buildCustomizationPayload(child.id, avatarId);
};

const saveCustomization = async (
  childUserId: string,
  avatarId: string,
  assetIds: string[]
) => {
  if (!Array.isArray(assetIds)) {
    throw new AppError(400, "assetIds required");
  }

  return prisma.$transaction(async (tx) => {
    const normalizedAssetIds = Array.from(new Set(assetIds.map((id) => (id || "").trim()).filter((id) => id)));
    if (normalizedAssetIds.length === 0) {
      throw new AppError(400, "assetIds required");
    }
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
      where: { id: { in: normalizedAssetIds } },
      include: { style: { include: { category: true } } },
    });

    const foundIds = new Set(validAssets.map((a) => a.id));
    const missingIds = normalizedAssetIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new AppError(404, `Asset(s) not found: ${missingIds.join(",")}`);
    }

    const wrongAvatarIds = validAssets
      .filter((a) => a.style?.category?.avatarId !== avatarId)
      .map((a) => a.id);
    if (wrongAvatarIds.length > 0) {
      throw new AppError(400, `One or more assets do not belong to this avatar: ${wrongAvatarIds.join(",")}`);
    }

    // enforce one asset per category (last occurrence wins)
    const orderMap = new Map<string, number>();
    normalizedAssetIds.forEach((id, idx) => orderMap.set(id, idx));
    const selectedByCategory = new Map<string, string>();
    for (const asset of validAssets) {
      const cat = asset.style.category.type;
      const prev = selectedByCategory.get(cat);
      if (!prev) {
        selectedByCategory.set(cat, asset.id);
      } else {
        // choose the one that appears later in the provided list
        const prevIdx = orderMap.get(prev) ?? -1;
        const curIdx = orderMap.get(asset.id) ?? -1;
        if (curIdx >= prevIdx) selectedByCategory.set(cat, asset.id);
      }
    }
    const selectedAssetIds = Array.from(selectedByCategory.values());
 
    const owned = await tx.childAsset.findMany({
      where: { childId: child.id, assetId: { in: normalizedAssetIds } },
      select: { assetId: true },
    });
    const ownedSet = new Set(owned.map((o) => o.assetId));
    const missingOwned = normalizedAssetIds.filter((id) => !ownedSet.has(id));
    if (missingOwned.length > 0) {
      throw new AppError(400, `Some assets are locked and cannot be equipped. Locked assetIds: ${missingOwned.join(",")}`);
    }

    await tx.childAvatarEquipped.deleteMany({ where: { childAvatarId: owns.id } });
    await tx.childAvatarEquipped.createMany({
      data: selectedAssetIds.map((id) => ({ childAvatarId: owns.id, assetId: id })),
    });

    await tx.childAvatar.updateMany({ where: { childId: child.id }, data: { isActive: false } });
    await tx.childAvatar.update({ where: { id: owns.id }, data: { isActive: true } });

    const unlocked = await tx.childAsset.findMany({
      where: { childId: child.id },
      select: { assetId: true },
    });

    return {
      savedCount: selectedAssetIds.length,
      unlockedAssetIds: unlocked.map((a) => a.assetId),
    };
  });
};

const purchaseAvatar = async (childUserId: string, avatarId: string) => {
  return prisma.$transaction(async (tx) => {
    const child = await tx.childProfile.findFirst({ where: { userId: childUserId } });


    if (!child) throw new AppError(404, "Child not found");
    const avatar = await tx.avatar.findUnique({ where: { id: avatarId } });


    if (!avatar) throw new AppError(404, "Avatar not found");
    const owned = await tx.childAvatar.findFirst({ where: { childId: child.id, avatarId } });

    if (owned) throw new AppError(400, "Avatar already owned");
    const price = avatar.price || 0;


    if ((child.coins || 0) < price) throw new AppError(400, "Insufficient coins");


    await tx.childProfile.update({ where: { id: child.id }, data: { coins: { decrement: price } } });


    const ownership = await tx.childAvatar.create({ data: { childId: child.id, avatarId, isActive: false } });


    return { ownershipId: ownership.id };
  });
};

const unlockAssetsForChild = async (childUserId: string, assetIds: string[]) => {
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw new AppError(400, "assetIds required");
  }
  return prisma.$transaction(async (tx) => {
    const child = await tx.childProfile.findFirst({ where: { userId: childUserId } });
    if (!child) throw new AppError(404, "Child not found");
    const assets = await tx.asset.findMany({
      where: { id: { in: assetIds } },
      select: {
        id: true,
        style: {
          select:
          {
            category: {
              select: { avatarId: true }
            }
          }
        }
      },
    });
    if (assets.length !== assetIds.length) throw new AppError(404, "One or more assets not found");
    const pairs = assets.map((a) => ({ assetId: a.id, avatarId: a.style?.category?.avatarId }));
    const unlinked = pairs.filter((p) => !p.avatarId).map((p) => p.assetId);
    if (unlinked.length > 0) {
      throw new AppError(400, `Asset(s) not linked to an avatar: ${unlinked.join(",")}`);
    }
    const requiredAvatarIds = Array.from(new Set(pairs.map((p) => p.avatarId as string)));
    if (requiredAvatarIds.length > 0) {
      const owned = await tx.childAvatar.findMany({
        where: {
          childId: child.id,
          avatarId: { in: requiredAvatarIds }
        },
        select: { avatarId: true },
      });
      const ownedSet = new Set(owned.map((o) => o.avatarId));
      const missingPairs = pairs.filter((p) => !ownedSet.has(p.avatarId as string));
      if (missingPairs.length > 0) {
        const detail = missingPairs.map((p) => `${p.avatarId} (asset:${p.assetId})`).join(",");
        throw new AppError(400, `You Dont Own this Avatar(s): ${detail}`);
      }
    }
    const alreadyOwned = await tx.childAsset.findMany({
      where: { childId: child.id, assetId: { in: assets.map((a) => a.id) } },
      select: { assetId: true },
    });
    const ownedSet = new Set(alreadyOwned.map((a) => a.assetId));
    const newIds = assets.map((a) => a.id).filter((id) => !ownedSet.has(id));

    if (newIds.length > 0) {
      await tx.childAsset.createMany({
        data: newIds.map((id) => ({ childId: child.id, assetId: id })),
        skipDuplicates: true,
      });
    }

    return { unlockedCount: newIds.length, alreadyOwnedIds: Array.from(ownedSet) };
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
  purchaseAvatar,
  unlockAssetsForChild,

  deleteAvatar,
  deleteCategory,
  deleteStyle,
  deleteAsset,
};
