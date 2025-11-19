/*
  Warnings:

  - Made the column `price` on table `Asset` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "imagePath" TEXT,
ALTER COLUMN "price" SET NOT NULL;

-- AlterTable
ALTER TABLE "ChildProfile" ADD COLUMN     "imagePath" TEXT,
ALTER COLUMN "image" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ParentProfile" ADD COLUMN     "imagePath" TEXT;
