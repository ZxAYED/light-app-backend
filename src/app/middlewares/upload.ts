
import multer from "multer";

// Keep uploads in memory so Supabase receives a buffer (disk storage leaves buffer undefined)
const storage = multer.memoryStorage();

// Limit payload size a bit to avoid accidental huge uploads
export const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});
