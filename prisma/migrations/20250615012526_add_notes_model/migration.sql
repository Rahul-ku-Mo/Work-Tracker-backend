/*
  Warnings:

  - Made the column `cardId` on table `Note` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "cardId" SET NOT NULL;
