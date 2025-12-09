-- CreateTable
CREATE TABLE "ChildAvatarEquipped" (
    "id" TEXT NOT NULL,
    "childAvatarId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "ChildAvatarEquipped_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChildAvatarEquipped_childAvatarId_assetId_key" ON "ChildAvatarEquipped"("childAvatarId", "assetId");

-- AddForeignKey
ALTER TABLE "ChildAvatarEquipped" ADD CONSTRAINT "ChildAvatarEquipped_childAvatarId_fkey" FOREIGN KEY ("childAvatarId") REFERENCES "ChildAvatar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAvatarEquipped" ADD CONSTRAINT "ChildAvatarEquipped_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
