/*
  Warnings:

  - Made the column `prefix` on table `Workspace` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Workspace" ALTER COLUMN "prefix" SET NOT NULL;
