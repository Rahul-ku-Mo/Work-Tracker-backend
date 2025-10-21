/*
  Warnings:

  - You are about to drop the `Milestone` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Milestone" DROP CONSTRAINT "Milestone_projectId_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "milestones" JSONB[];

-- DropTable
DROP TABLE "Milestone";

-- DropEnum
DROP TYPE "MilestoneStatus";
