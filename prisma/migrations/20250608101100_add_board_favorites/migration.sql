-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "BoardRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "Message" AS ENUM ('JOIN', 'LEAVE', 'CARD_ASSIGNED', 'CARD_UPDATED', 'CARD_COMPLETED', 'CARD_COMMENTED', 'CARD_DUE_SOON', 'CARD_OVERDUE', 'MENTION');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('VELOCITY', 'COMPLETION_RATE', 'AVERAGE_TIME', 'EFFICIENCY', 'PLANNING_ACCURACY', 'REVIEW_EFFICIENCY', 'TIME_DISTRIBUTION', 'PEAK_PERFORMANCE', 'TEAM_VELOCITY', 'BURNDOWN_RATE', 'COLLABORATION_SCORE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'TEAM', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "username" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phoneNumber" TEXT,
    "state" TEXT,
    "address" TEXT,
    "zipCode" TEXT,
    "company" TEXT,
    "department" TEXT,
    "isPaidUser" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "role" "AppRole" NOT NULL DEFAULT 'USER',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT,
    "efficiency" INTEGER,
    "stripeCustomerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT,
    "captainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "colorValue" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardUser" (
    "id" TEXT NOT NULL,
    "boardId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'MEMBER',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "boardId" INTEGER NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Column" (
    "id" SERIAL NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "boardId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Column_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "columnId" INTEGER NOT NULL,
    "labels" TEXT[],
    "attachments" TEXT[],
    "priority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "isOnTime" BOOLEAN,
    "sprintId" TEXT,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "cardId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "message" "Message" NOT NULL,
    "metadata" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversationMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "aiConversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "plannedPoints" DOUBLE PRECISION NOT NULL,
    "teamId" TEXT NOT NULL,
    "boardId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedPoints" DOUBLE PRECISION,
    "efficiency" DOUBLE PRECISION,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "lastResumeTime" TIMESTAMP(3),
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION,
    "previousValue" DOUBLE PRECISION,
    "notes" TEXT,
    "userId" TEXT,
    "teamId" TEXT,
    "sprintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "velocity" DOUBLE PRECISION NOT NULL,
    "velocityTrend" DOUBLE PRECISION NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "completionRateTrend" DOUBLE PRECISION NOT NULL,
    "avgCompletionTime" DOUBLE PRECISION NOT NULL,
    "avgCompletionTimeTrend" DOUBLE PRECISION NOT NULL,
    "teamEfficiency" DOUBLE PRECISION NOT NULL,
    "teamEfficiencyTrend" DOUBLE PRECISION NOT NULL,
    "sprintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPerformanceHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgSessionTime" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "efficiencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "productivityRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "productivityTrend" TEXT NOT NULL DEFAULT 'stable',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPerformanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_assignee" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_assignee_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CardToTag" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CardToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Team_joinCode_key" ON "Team"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "Team_captainId_key" ON "Team"("captainId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardUser_boardId_userId_key" ON "BoardUser"("boardId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardInvitation_token_key" ON "BoardInvitation"("token");

-- CreateIndex
CREATE INDEX "BoardInvitation_email_idx" ON "BoardInvitation"("email");

-- CreateIndex
CREATE INDEX "BoardInvitation_token_idx" ON "BoardInvitation"("token");

-- CreateIndex
CREATE INDEX "Card_sprintId_idx" ON "Card"("sprintId");

-- CreateIndex
CREATE INDEX "Sprint_teamId_idx" ON "Sprint"("teamId");

-- CreateIndex
CREATE INDEX "Sprint_boardId_idx" ON "Sprint"("boardId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");

-- CreateIndex
CREATE INDEX "TimeEntry_cardId_idx" ON "TimeEntry"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "PerformanceMetric_userId_idx" ON "PerformanceMetric"("userId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_teamId_idx" ON "PerformanceMetric"("teamId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_sprintId_idx" ON "PerformanceMetric"("sprintId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_date_idx" ON "PerformanceMetric"("date");

-- CreateIndex
CREATE INDEX "PerformanceMetric_metricType_idx" ON "PerformanceMetric"("metricType");

-- CreateIndex
CREATE INDEX "TeamPerformanceSnapshot_teamId_idx" ON "TeamPerformanceSnapshot"("teamId");

-- CreateIndex
CREATE INDEX "TeamPerformanceSnapshot_date_idx" ON "TeamPerformanceSnapshot"("date");

-- CreateIndex
CREATE INDEX "TeamPerformanceSnapshot_sprintId_idx" ON "TeamPerformanceSnapshot"("sprintId");

-- CreateIndex
CREATE INDEX "UserPerformanceHistory_userId_idx" ON "UserPerformanceHistory"("userId");

-- CreateIndex
CREATE INDEX "UserPerformanceHistory_date_idx" ON "UserPerformanceHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "ImageUpload_userId_idx" ON "ImageUpload"("userId");

-- CreateIndex
CREATE INDEX "ImageUpload_createdAt_idx" ON "ImageUpload"("createdAt");

-- CreateIndex
CREATE INDEX "_assignee_B_index" ON "_assignee"("B");

-- CreateIndex
CREATE INDEX "_CardToTag_B_index" ON "_CardToTag"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardUser" ADD CONSTRAINT "BoardUser_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardUser" ADD CONSTRAINT "BoardUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardInvitation" ADD CONSTRAINT "BoardInvitation_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardInvitation" ADD CONSTRAINT "BoardInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversationMessage" ADD CONSTRAINT "AiConversationMessage_aiConversationId_fkey" FOREIGN KEY ("aiConversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPerformanceSnapshot" ADD CONSTRAINT "TeamPerformanceSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPerformanceSnapshot" ADD CONSTRAINT "TeamPerformanceSnapshot_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPerformanceHistory" ADD CONSTRAINT "UserPerformanceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageUpload" ADD CONSTRAINT "ImageUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_assignee" ADD CONSTRAINT "_assignee_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_assignee" ADD CONSTRAINT "_assignee_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToTag" ADD CONSTRAINT "_CardToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToTag" ADD CONSTRAINT "_CardToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
