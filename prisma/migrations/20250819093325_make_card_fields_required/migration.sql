/*
  Warnings:

  - Made the column `slug` on table `Card` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workspaceNumber` on table `Card` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Card" ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "workspaceNumber" SET NOT NULL;
