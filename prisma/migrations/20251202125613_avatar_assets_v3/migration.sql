/*
  Warnings:

  - A unique constraint covering the columns `[avatarId,name]` on the table `AvatarCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AvatarCategory_avatarId_name_key" ON "AvatarCategory"("avatarId", "name");
