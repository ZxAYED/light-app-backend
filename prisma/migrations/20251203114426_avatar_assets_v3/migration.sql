/*
  Warnings:

  - You are about to drop the column `origin` on the `Avatar` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Avatar" DROP COLUMN "origin";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT;
