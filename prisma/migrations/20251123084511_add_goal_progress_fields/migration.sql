-- AlterTable
ALTER TABLE "GoalAssignment" ADD COLUMN     "cycleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastResetAt" TIMESTAMP(3),
ADD COLUMN     "rewardGiven" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE INDEX "ChildProfile_userId_idx" ON "ChildProfile"("userId");
