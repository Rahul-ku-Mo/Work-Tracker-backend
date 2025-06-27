/*
  Warnings:

  - You are about to drop the `NoteComment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NoteComment" DROP CONSTRAINT "NoteComment_noteId_fkey";

-- DropForeignKey
ALTER TABLE "NoteComment" DROP CONSTRAINT "NoteComment_userId_fkey";

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "storyPoints" INTEGER DEFAULT 0;

-- DropTable
DROP TABLE "NoteComment";
