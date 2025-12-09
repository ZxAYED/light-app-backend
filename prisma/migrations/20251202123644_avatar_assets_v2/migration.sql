/*
  Warnings:

  - You are about to drop the column `avatarId` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `imagePath` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `style` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Avatar` table. All the data in the column will be lost.
  - Added the required column `assetImage` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `styleId` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "AvatarCategoryType" AS ENUM ('SKIN', 'HAIR', 'EYES', 'NOSE', 'DRESS', 'SHOES', 'ACCESSORY', 'JEWELRY', 'PET');

-- AlterEnum
ALTER TYPE "AssetCategory" ADD VALUE 'FACE';

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_avatarId_fkey";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "avatarId",
DROP COLUMN "category",
DROP COLUMN "image",
DROP COLUMN "imagePath",
DROP COLUMN "name",
DROP COLUMN "origin",
DROP COLUMN "style",
ADD COLUMN     "assetImage" TEXT NOT NULL,
ADD COLUMN     "assetImgPath" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isStarter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchased" INTEGER DEFAULT 0,
ADD COLUMN     "rarity" "Rarity" DEFAULT 'COMMON',
ADD COLUMN     "styleId" TEXT NOT NULL,
ALTER COLUMN "price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Avatar" DROP COLUMN "image",
DROP COLUMN "name",
ADD COLUMN     "avatarImgPath" TEXT,
ADD COLUMN     "avatarImgUrl" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "price" INTEGER DEFAULT 0,
ADD COLUMN     "purchased" INTEGER DEFAULT 0,
ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "AvatarCategory" (
    "id" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "name" "AvatarCategoryType" NOT NULL,

    CONSTRAINT "AvatarCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetStyle" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "styleName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildAvatar" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChildAvatar_childId_avatarId_key" ON "ChildAvatar"("childId", "avatarId");

-- AddForeignKey
ALTER TABLE "AvatarCategory" ADD CONSTRAINT "AvatarCategory_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetStyle" ADD CONSTRAINT "AssetStyle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AvatarCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "AssetStyle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAvatar" ADD CONSTRAINT "ChildAvatar_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAvatar" ADD CONSTRAINT "ChildAvatar_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
