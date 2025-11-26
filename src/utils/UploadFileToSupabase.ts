import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import AppError from "../app/Errors/AppError";

dotenv.config();

const BUCKET = process.env.SUPABASE_BUCKET || "shalana07";

export const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABSE_SERVICE_KEY!
);

export async function uploadImageToSupabase(
  file: Express.Multer.File,
  fileName: string,
  oldPath?: string | null
) {
  const BUCKET = "shalana07";  

 
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
  url: `${process.env.SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET}/${newPath}`,
  path: newPath,
};

}
