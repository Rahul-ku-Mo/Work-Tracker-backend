/*
  Warnings:

  - A unique constraint covering the columns `[columnId,workspaceNumber]` on the table `Card` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[prefix]` on the table `Workspace` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "workspaceNumber" INTEGER;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "nextCardNum" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "prefix" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Card_columnId_workspaceNumber_key" ON "Card"("columnId", "workspaceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_prefix_key" ON "Workspace"("prefix");
