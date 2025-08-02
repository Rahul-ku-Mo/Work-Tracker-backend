/*
  Warnings:

  - The `milestones` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `slug` on table `Workspace` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "milestones",
ADD COLUMN     "milestones" JSONB[];

-- AlterTable
ALTER TABLE "Workspace" ALTER COLUMN "slug" SET NOT NULL;
