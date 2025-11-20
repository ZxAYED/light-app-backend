import { createClient } from "@supabase/supabase-js";
import AppError from "../app/Errors/AppError";
import config from "../config";

export const supabase = createClient(
  config.SupabseProjectUrl!,
  config.SupabaseServiceKey!
);

export async function uploadImageToSupabase(

  newFile: Express.Multer.File,
  fileName: string,
    oldPath?: string | null,
) {
  if (!newFile) {
    throw new AppError(400, "No file uploaded");
  }

  // Delete old image if exists
  if (oldPath) {
    await supabase.storage.from("shalana07").remove([oldPath]);
  }

  // extension from original file
  const ext = newFile.originalname.split(".").pop();

  // final path inside bucket/folder
  const newPath = `${fileName}.${ext}`;

  // Upload buffer
  const { error } = await supabase.storage
    .from("shalana07")
    .upload(newPath, newFile.buffer, {
      contentType: newFile.mimetype,
      cacheControl: "3600",
      upsert: true, // allow replace behavior
    });

  if (error) throw new AppError(400, error.message);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("shalana07")
    .getPublicUrl(newPath);

  return {
    url: urlData.publicUrl,
    path: newPath,
  };
}
