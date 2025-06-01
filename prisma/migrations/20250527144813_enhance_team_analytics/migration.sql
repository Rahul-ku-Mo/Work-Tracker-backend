-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MetricType" ADD VALUE 'TEAM_VELOCITY';
ALTER TYPE "MetricType" ADD VALUE 'BURNDOWN_RATE';
ALTER TYPE "MetricType" ADD VALUE 'COLLABORATION_SCORE';

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

-- AddForeignKey
ALTER TABLE "TeamPerformanceSnapshot" ADD CONSTRAINT "TeamPerformanceSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPerformanceSnapshot" ADD CONSTRAINT "TeamPerformanceSnapshot_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPerformanceHistory" ADD CONSTRAINT "UserPerformanceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
