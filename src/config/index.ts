import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });
export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  SendGridEmail:process.env.SENDGRID_EMAIL,
  SendGridAPI:process.env.SENDGRID_API_KEY,
  SupabaseServiceKey:process.env.SUPABSE_SERVICE_KEY,
  SupabseProjectUrl:process.env.SUPABASE_PROJECT_URL,
  DefaultAvatarId: process.env.DEFAULT_AVATAR_ID,
  jwt: {
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    access_token_expires_in: process.env.ACCESS_TOKEN_EXPIRES_IN,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
  },
};
