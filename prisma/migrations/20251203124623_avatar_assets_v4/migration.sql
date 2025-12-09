/*
  Warnings:

  - You are about to drop the column `name` on the `AvatarCategory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[avatarId,type]` on the table `AvatarCategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `AvatarCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AvatarCategory_avatarId_name_key";

-- AlterTable
ALTER TABLE "AvatarCategory" DROP COLUMN "name",
ADD COLUMN     "type" "AvatarCategoryType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AvatarCategory_avatarId_type_key" ON "AvatarCategory"("avatarId", "type");
