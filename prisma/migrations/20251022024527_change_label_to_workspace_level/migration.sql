/*
  Warnings:

  - You are about to drop the column `teamId` on the `Label` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,workspaceId]` on the table `Label` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workspaceId` to the `Label` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Remove all card-label associations to avoid foreign key issues
DELETE FROM "_CardToLabel";

-- Step 2: Drop existing foreign key constraint
ALTER TABLE "Label" DROP CONSTRAINT "Label_teamId_fkey";

-- Step 3: Drop existing indexes
DROP INDEX "Label_name_teamId_key";
DROP INDEX "Label_teamId_idx";

-- Step 4: Remove all existing labels (migration from team to workspace)
DELETE FROM "Label";

-- Step 5: Drop the teamId column
ALTER TABLE "Label" DROP COLUMN "teamId";

-- Step 6: Add workspaceId column
ALTER TABLE "Label" ADD COLUMN "workspaceId" INTEGER NOT NULL;

-- Step 7: Create new index on workspaceId
CREATE INDEX "Label_workspaceId_idx" ON "Label"("workspaceId");

-- Step 8: Create unique constraint on name and workspaceId
CREATE UNIQUE INDEX "Label_name_workspaceId_key" ON "Label"("name", "workspaceId");

-- Step 9: Add foreign key constraint to Workspace
ALTER TABLE "Label" ADD CONSTRAINT "Label_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

