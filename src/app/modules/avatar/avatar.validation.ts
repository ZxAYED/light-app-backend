import { z } from "zod";

export const createAvatarSchema = z.object({
  gender: z.enum(["MALE", "FEMALE"]),

  region: z.string(),
  description: z.string(),
  price: z.number(),
   
});

export type CreateAvatarInput = z.infer<typeof createAvatarSchema>;


export const createStyleSchema = z.object({
  avatarId: z.string().min(1),
  type: z.enum(["SKIN","HAIR","EYES","NOSE","DRESS","SHOES","ACCESSORY","JEWELRY","PET"]),
  styleName: z.string().min(1),
  description: z.string().optional()
});

export type CreateStyleInput = z.infer<typeof createStyleSchema>;





export const createAssetSchema = z.object({
  styleId: z.string(),
  colorName: z.string(), 
  description: z.string(),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]),
  rarity: z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY"]).optional(),
  price: z.number(),
  isStarter: z.boolean().optional().default(false),
 
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const saveCustomizationSchema = z.object({
  avatarId: z.string().min(1),
  assetIds: z.array(z.string().min(1)).min(1),
    
});
export type SaveCustomizationInput = z.infer<typeof saveCustomizationSchema>;
