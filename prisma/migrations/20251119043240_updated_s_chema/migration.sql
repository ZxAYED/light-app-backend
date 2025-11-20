/*
  Warnings:

  - You are about to drop the column `gender` on the `ParentProfile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Relation" AS ENUM ('FATHER', 'MOTHER', 'BROTHER', 'SISTER');

-- AlterTable
ALTER TABLE "ParentProfile" DROP COLUMN "gender",
ADD COLUMN     "relation" "Relation",
ALTER COLUMN "image" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otp_expires_at" TIMESTAMP(3);
