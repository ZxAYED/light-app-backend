-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PARENT', 'CHILD', 'ADMIN');

-- CreateEnum
CREATE TYPE "Relation" AS ENUM ('FATHER', 'MOTHER', 'BROTHER', 'SISTER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ChildAccountType" AS ENUM ('ADMIN', 'MODERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AuthorRole" AS ENUM ('PARENT', 'CHILD');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GOAL_CREATED', 'GOAL_UPDATED', 'GOAL_COMPLETED', 'HELP_REQUEST', 'HELP_REQUEST_ACCEPTED', 'HELP_REQUEST_REJECTED', 'REWARD_UNLOCKED', 'DAILY_REMINDER', 'CHILD_PROGRESS_UPDATE');

-- CreateEnum
CREATE TYPE "HelpStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('SKIN', 'HAIR', 'EYES', 'NOSE', 'DRESS', 'SHOES', 'ACCESSORY', 'JEWELRY', 'PET', 'AVATAR_BASE');

-- CreateEnum
CREATE TYPE "AssetGender" AS ENUM ('MALE', 'FEMALE', 'UNISEX');

-- CreateEnum
CREATE TYPE "AvatarGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ANDROID', 'IOS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PARENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "otp" TEXT,
    "isDeleted" BOOLEAN DEFAULT false,
    "otp_expires_at" TIMESTAMP(3),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "password_reset_otp" TEXT,
    "password_reset_expires" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "image" TEXT,
    "imagePath" TEXT,
    "relation" "Relation",
    "dateOfBirth" TIMESTAMP(3),
    "location" TEXT,
    "isDeleted" BOOLEAN DEFAULT false,
    "giftedCoins" INTEGER DEFAULT 0,
    "pushNotification" BOOLEAN DEFAULT true,
    "dailyReminders" BOOLEAN DEFAULT true,
    "childTaskUpdates" BOOLEAN DEFAULT true,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "accountType" "ChildAccountType" NOT NULL DEFAULT 'MODERATOR',
    "name" TEXT NOT NULL,
    "gender" "Gender",
    "phone" TEXT,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "location" TEXT,
    "image" TEXT,
    "imagePath" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "relation" TEXT,
    "editProfile" BOOLEAN NOT NULL DEFAULT true,
    "createGoals" BOOLEAN NOT NULL DEFAULT true,
    "approveTasks" BOOLEAN NOT NULL DEFAULT true,
    "deleteGoals" BOOLEAN NOT NULL DEFAULT false,
    "deleteAccount" BOOLEAN NOT NULL DEFAULT false,
    "avatarId" TEXT,
    "isDeleted" BOOLEAN DEFAULT false,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" "AuthorRole" NOT NULL DEFAULT 'PARENT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "GoalType" NOT NULL DEFAULT 'ONE_TIME',
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "durationMin" INTEGER,
    "progress" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalAssignment" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GoalAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "childId" TEXT,
    "goalId" TEXT,
    "helpRequestId" TEXT,
    "assetId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpRequest" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "message" TEXT,
    "status" "HelpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpRequestMessage" (
    "id" TEXT NOT NULL,
    "helpRequestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpRequestMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildAsset" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "style" TEXT,
    "colorName" TEXT,
    "image" TEXT NOT NULL,
    "imagePath" TEXT,
    "price" INTEGER NOT NULL,
    "origin" TEXT,
    "gender" "AssetGender",
    "avatarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avatar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "origin" TEXT,
    "gender" "AvatarGender" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "childId" TEXT,
    "token" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "childId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "ParentProfile"("userId");

-- CreateIndex
CREATE INDEX "ParentProfile_userId_idx" ON "ParentProfile"("userId");

-- CreateIndex
CREATE INDEX "ParentProfile_name_idx" ON "ParentProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChildProfile_userId_key" ON "ChildProfile"("userId");

-- CreateIndex
CREATE INDEX "ChildProfile_parentId_idx" ON "ChildProfile"("parentId");

-- CreateIndex
CREATE INDEX "ChildProfile_name_idx" ON "ChildProfile"("name");

-- CreateIndex
CREATE INDEX "Goal_authorId_idx" ON "Goal"("authorId");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Goal_type_idx" ON "Goal"("type");

-- CreateIndex
CREATE INDEX "Goal_createdAt_idx" ON "Goal"("createdAt");

-- CreateIndex
CREATE INDEX "Goal_title_idx" ON "Goal"("title");

-- CreateIndex
CREATE INDEX "GoalAssignment_goalId_idx" ON "GoalAssignment"("goalId");

-- CreateIndex
CREATE INDEX "GoalAssignment_childId_idx" ON "GoalAssignment"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalAssignment_goalId_childId_key" ON "GoalAssignment"("goalId", "childId");

-- CreateIndex
CREATE INDEX "HelpRequestMessage_helpRequestId_idx" ON "HelpRequestMessage"("helpRequestId");

-- CreateIndex
CREATE INDEX "HelpRequestMessage_senderId_idx" ON "HelpRequestMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildAsset_childId_assetId_key" ON "ChildAsset"("childId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "PushToken_childId_idx" ON "PushToken"("childId");

-- AddForeignKey
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalAssignment" ADD CONSTRAINT "GoalAssignment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalAssignment" ADD CONSTRAINT "GoalAssignment_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_helpRequestId_fkey" FOREIGN KEY ("helpRequestId") REFERENCES "HelpRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpRequestMessage" ADD CONSTRAINT "HelpRequestMessage_helpRequestId_fkey" FOREIGN KEY ("helpRequestId") REFERENCES "HelpRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpRequestMessage" ADD CONSTRAINT "HelpRequestMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAsset" ADD CONSTRAINT "ChildAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAsset" ADD CONSTRAINT "ChildAsset_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
