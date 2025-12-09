import { UserRole } from "@prisma/client";
import express from "express";
import RoleValidation from "../../middlewares/RoleValidation";
import { upload } from "../../middlewares/upload";
import validateFormData from "../../middlewares/ValidationFormdataParser";
import validateJSON from "../../middlewares/ValidationParser";
import { AvatarController } from "./avatar.controller";
import {
  createAssetSchema,
  createAvatarSchema,
  createStyleSchema,
  saveCustomizationSchema,
} from "./avatar.validation";

const router = express.Router();



router.post(
  "/",
  RoleValidation(UserRole.ADMIN),
  upload.single("file"),
  validateFormData(createAvatarSchema),
  AvatarController.createAvatar
);

router.post(
  "/style",
  RoleValidation(UserRole.ADMIN),
  validateJSON(createStyleSchema),
  AvatarController.createStyle
);

router.post(
  "/create-asset",
  RoleValidation(UserRole.ADMIN),
  upload.single("file"),
  validateFormData(createAssetSchema),
  AvatarController.createAsset
);

router.get(
  "/available",
  RoleValidation(UserRole.CHILD),
  AvatarController.getAvailableAvatars
);

router.get(
  "/owned",
  RoleValidation(UserRole.CHILD),
  AvatarController.getOwnedAvatars
);

router.get(
  "/assets/style/:styleId",
  RoleValidation(UserRole.CHILD),
  AvatarController.getAssetsByStyle
);


router.get(
  "/assets/category/:type",
  RoleValidation(UserRole.CHILD),
  AvatarController.getAssetsByCategoryType
);

router.get(
  "/asset/:assetId",
  RoleValidation(UserRole.CHILD),
  AvatarController.getAssetDetails
);

router.get(
  "/customization/:avatarId",
  RoleValidation(UserRole.CHILD),
  AvatarController.getCustomizationData
);

router.post(
  "/customization/",
  RoleValidation(UserRole.CHILD),
  validateJSON(saveCustomizationSchema),
  AvatarController.saveCustomization
);

router.post(
  "/purchase/:avatarId",
  RoleValidation(UserRole.CHILD),
  AvatarController.purchaseAvatar
);

router.post(
  "/unlock-asset",
  RoleValidation(UserRole.CHILD),
  AvatarController.unlockAssets
);


router.delete(
  "/:avatarId",
  RoleValidation(UserRole.ADMIN),
  AvatarController.deleteAvatar
);


router.delete(
  "/category/:categoryId",
  RoleValidation(UserRole.ADMIN),
  AvatarController.deleteCategory
);


router.delete(
  "/style/:styleId",
  RoleValidation(UserRole.ADMIN),
  AvatarController.deleteStyle
);


router.delete(
  "/asset/:assetId",
  RoleValidation(UserRole.ADMIN),
  AvatarController.deleteAsset
);

export const AvatarRoutes = router;
