/*
  Warnings:

  - You are about to drop the column `coverImage` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the `NoteComment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NoteComment" DROP CONSTRAINT "NoteComment_noteId_fkey";

-- DropForeignKey
ALTER TABLE "NoteComment" DROP CONSTRAINT "NoteComment_userId_fkey";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "coverImage";

-- DropTable
DROP TABLE "NoteComment";
