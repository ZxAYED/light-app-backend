/*
  Warnings:

  - You are about to drop the column `cycleCount` on the `GoalAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `GoalAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `rewardGiven` on the `GoalAssignment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "isRecurring" BOOLEAN DEFAULT false,
ADD COLUMN     "nextResetAt" TIMESTAMP(3),
ADD COLUMN     "progressAvg" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "GoalAssignment" DROP COLUMN "cycleCount",
DROP COLUMN "progress",
DROP COLUMN "rewardGiven",
ADD COLUMN     "lastUpdatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "minutesCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "percentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progressAvg" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GoalProgressLog" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalProgressLog_goalId_idx" ON "GoalProgressLog"("goalId");

-- CreateIndex
CREATE INDEX "GoalProgressLog_childId_idx" ON "GoalProgressLog"("childId");

-- AddForeignKey
ALTER TABLE "GoalProgressLog" ADD CONSTRAINT "GoalProgressLog_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalProgressLog" ADD CONSTRAINT "GoalProgressLog_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
