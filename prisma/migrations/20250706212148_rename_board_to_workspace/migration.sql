/*
  Warnings:

  - You are about to drop the column `boardId` on the `Column` table. All the data in the column will be lost.
  - You are about to drop the column `boardId` on the `Sprint` table. All the data in the column will be lost.
  - You are about to drop the column `avgCompletionTime` on the `TeamPerformanceSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `avgCompletionTimeTrend` on the `TeamPerformanceSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `completionRate` on the `TeamPerformanceSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `completionRateTrend` on the `TeamPerformanceSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `teamEfficiency` on the `TeamPerformanceSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `teamEfficiencyTrend` on the `TeamPerformanceSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TeamPerformanceSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `velocityTrend` on the `TeamPerformanceSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `avgSessionTime` on the `UserPerformanceHistory` table. All the data in the column will be lost.
  - You are about to drop the column `efficiencyScore` on the `UserPerformanceHistory` table. All the data in the column will be lost.
  - You are about to drop the column `hoursWorked` on the `UserPerformanceHistory` table. All the data in the column will be lost.
  - You are about to drop the column `productivityRating` on the `UserPerformanceHistory` table. All the data in the column will be lost.
  - You are about to drop the column `productivityTrend` on the `UserPerformanceHistory` table. All the data in the column will be lost.
  - You are about to drop the column `tasksCompleted` on the `UserPerformanceHistory` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `UserPerformanceHistory` table. All the data in the column will be lost.
  - You are about to drop the `Board` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BoardInvitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BoardUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectBoard` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `workspaceId` to the `Column` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Sprint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `efficiency` to the `TeamPerformanceSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `efficiency` to the `UserPerformanceHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `velocity` to the `UserPerformanceHistory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "Board" DROP CONSTRAINT "Board_userId_fkey";

-- DropForeignKey
ALTER TABLE "BoardInvitation" DROP CONSTRAINT "BoardInvitation_boardId_fkey";

-- DropForeignKey
ALTER TABLE "BoardInvitation" DROP CONSTRAINT "BoardInvitation_invitedBy_fkey";

-- DropForeignKey
ALTER TABLE "BoardUser" DROP CONSTRAINT "BoardUser_boardId_fkey";

-- DropForeignKey
ALTER TABLE "BoardUser" DROP CONSTRAINT "BoardUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "Column" DROP CONSTRAINT "Column_boardId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectBoard" DROP CONSTRAINT "ProjectBoard_boardId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectBoard" DROP CONSTRAINT "ProjectBoard_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Sprint" DROP CONSTRAINT "Sprint_boardId_fkey";

-- DropIndex
DROP INDEX "Sprint_boardId_idx";

-- DropIndex
DROP INDEX "TeamPerformanceSnapshot_sprintId_idx";

-- AlterTable
ALTER TABLE "Column" DROP COLUMN "boardId",
ADD COLUMN     "workspaceId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Sprint" DROP COLUMN "boardId",
ADD COLUMN     "workspaceId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TeamPerformanceSnapshot" DROP COLUMN "avgCompletionTime",
DROP COLUMN "avgCompletionTimeTrend",
DROP COLUMN "completionRate",
DROP COLUMN "completionRateTrend",
DROP COLUMN "teamEfficiency",
DROP COLUMN "teamEfficiencyTrend",
DROP COLUMN "updatedAt",
DROP COLUMN "velocityTrend",
ADD COLUMN     "efficiency" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserPerformanceHistory" DROP COLUMN "avgSessionTime",
DROP COLUMN "efficiencyScore",
DROP COLUMN "hoursWorked",
DROP COLUMN "productivityRating",
DROP COLUMN "productivityTrend",
DROP COLUMN "tasksCompleted",
DROP COLUMN "updatedAt",
ADD COLUMN     "efficiency" INTEGER NOT NULL,
ADD COLUMN     "velocity" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "date" DROP DEFAULT;

-- DropTable
DROP TABLE "Board";

-- DropTable
DROP TABLE "BoardInvitation";

-- DropTable
DROP TABLE "BoardUser";

-- DropTable
DROP TABLE "ProjectBoard";

-- DropEnum
DROP TYPE "BoardRole";

-- CreateTable
CREATE TABLE "Workspace" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "userId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "colorValue" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceUser" (
    "id" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectWorkspace" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceUser_workspaceId_userId_key" ON "WorkspaceUser"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_token_key" ON "WorkspaceInvitation"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_email_idx" ON "WorkspaceInvitation"("email");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_token_idx" ON "WorkspaceInvitation"("token");

-- CreateIndex
CREATE INDEX "ProjectWorkspace_projectId_idx" ON "ProjectWorkspace"("projectId");

-- CreateIndex
CREATE INDEX "ProjectWorkspace_workspaceId_idx" ON "ProjectWorkspace"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWorkspace_projectId_workspaceId_key" ON "ProjectWorkspace"("projectId", "workspaceId");

-- CreateIndex
CREATE INDEX "Sprint_workspaceId_idx" ON "Sprint"("workspaceId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUser" ADD CONSTRAINT "WorkspaceUser_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUser" ADD CONSTRAINT "WorkspaceUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkspace" ADD CONSTRAINT "ProjectWorkspace_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkspace" ADD CONSTRAINT "ProjectWorkspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
