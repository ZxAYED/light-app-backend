-- AlterTable
ALTER TABLE "ChildProfile" ADD COLUMN     "completedTask" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "AssetStyle_categoryId_idx" ON "AssetStyle"("categoryId");

-- CreateIndex
CREATE INDEX "AssetStyle_styleName_idx" ON "AssetStyle"("styleName");
