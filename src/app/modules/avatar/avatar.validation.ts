import { z } from "zod";

export const createAvatarSchema = z.object({
  gender: z.enum(["MALE", "FEMALE"]),
  origin: z.string(),
  region: z.string(),
  description: z.string(),
  price: z.number(),
   
});

export type CreateAvatarInput = z.infer<typeof createAvatarSchema>;


export const createCategorySchema = z.object({
  name: z.enum(["SKIN", "HAIR", "EYES", "NOSE", "DRESS", "SHOES", "ACCESSORY", "JEWELRY", "PET"]),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;


export const createStyleSchema = z.object({
  styleName: z.string().min(1, "Style name is required"), 
  description: z.string().optional(),
  
});

export type CreateStyleInput = z.infer<typeof createStyleSchema>;

export const createAssetSchema = z.object({
  colorName: z.string(), 
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]),
  rarity: z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY"]).optional(),
  price: z.number().optional().default(0),
  isStarter: z.boolean().optional().default(false),
 
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
