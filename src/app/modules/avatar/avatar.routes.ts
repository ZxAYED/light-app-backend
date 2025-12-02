import express from "express";
import RoleValidation from "../../middlewares/RoleValidation";
import { upload } from "../../middlewares/upload";
import validateFormData from "../../middlewares/ValidationFormdataParser";
import validateJSON from "../../middlewares/ValidationParser";
import { AvatarController } from "./avatar.controller";
import {
  createAssetSchema,
  createAvatarSchema,
  createCategorySchema,
  createStyleSchema,
} from "./avatar.validation";

const router = express.Router();



router.post(
  "/",
  RoleValidation("admin"),
  upload.single("file"),
  validateFormData(createAvatarSchema),
  AvatarController.createAvatar
);

router.post(
  "/:avatarId/category",
  RoleValidation("admin"),
  validateJSON(createCategorySchema),
  AvatarController.createCategory
);

router.post(
  "/category/:categoryId/style",
  RoleValidation("admin"),
  validateJSON(createStyleSchema),
  AvatarController.createStyle
);

router.post(
  "/style/:styleId/asset",
  RoleValidation("admin"),
  upload.single("file"),
  validateFormData(createAssetSchema),
  AvatarController.createAsset
);




router.delete(
  "/:avatarId",
  RoleValidation("admin"),
  AvatarController.deleteAvatar
);


router.delete(
  "/category/:categoryId",
  RoleValidation("admin"),
  AvatarController.deleteCategory
);


router.delete(
  "/style/:styleId",
  RoleValidation("admin"),
  AvatarController.deleteStyle
);


router.delete(
  "/asset/:assetId",
  RoleValidation("admin"),
  AvatarController.deleteAsset
);

export const AvatarRoutes = router;
