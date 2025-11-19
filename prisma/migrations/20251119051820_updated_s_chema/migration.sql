-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password_reset_expires" TIMESTAMP(3),
ADD COLUMN     "password_reset_otp" TEXT;
