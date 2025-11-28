-- AlterTable
ALTER TABLE "GoalAssignment" ALTER COLUMN "lastUpdatedAt" DROP NOT NULL,
ALTER COLUMN "minutesCompleted" DROP NOT NULL,
ALTER COLUMN "percentage" DROP NOT NULL,
ALTER COLUMN "progressAvg" DROP NOT NULL;
