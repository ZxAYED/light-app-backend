import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import AppError from "../app/Errors/AppError";

dotenv.config();

  const BUCKET = "shalana07";  

export const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABSE_SERVICE_KEY!
);

export async function uploadImageToSupabase(
  file: Express.Multer.File,
  fileName: string,
  oldPath?: string | null
) {


 
  if (!file || !file.buffer) {
    throw new AppError(400, "Invalid file. Ensure multer uses memoryStorage.");
  }
if (!file.buffer) {
  throw new AppError(400, "File buffer is empty. Multer upload failed.");
}
  // Remove old image
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath]);
  }
  const ext = file.originalname.split(".").pop();
  const newPath = `${fileName}.${ext}`;

  // Delete old image if exists
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath]);
  }

  // Upload
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) throw new AppError(400, error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
console.log("File received:", {
  originalname: file.originalname,
  size: file.size,
  mimetype: file.mimetype,
  hasBuffer: !!file.buffer
});
return {
  // url: `${process.env.SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET}/${newPath}`,
  url: data.publicUrl,
  path: newPath,
};

}
export async function deleteImageFromSupabase(path: string) {
  if (!path) { 
    throw new AppError(400, "No Path Found to Delete")
  };

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("Supabase delete error:", error);
    throw new AppError(400, error.message);
  }
}