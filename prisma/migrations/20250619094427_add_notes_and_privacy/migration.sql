/*
  Warnings:

  - You are about to drop the column `category` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the `CardNote` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CardNote" DROP CONSTRAINT "CardNote_cardId_fkey";

-- DropForeignKey
ALTER TABLE "CardNote" DROP CONSTRAINT "CardNote_noteId_fkey";

-- DropIndex
DROP INDEX "Note_category_idx";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "category",
DROP COLUMN "isPublic",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "iconColor" TEXT,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" INTEGER,
ADD COLUMN     "tags" TEXT[];

-- DropTable
DROP TABLE "CardNote";

-- CreateTable
CREATE TABLE "NoteCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hoverColor" TEXT,
    "userId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteCategory_userId_idx" ON "NoteCategory"("userId");

-- CreateIndex
CREATE INDEX "NoteCategory_slug_idx" ON "NoteCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NoteCategory_userId_slug_key" ON "NoteCategory"("userId", "slug");

-- CreateIndex
CREATE INDEX "Note_categoryId_idx" ON "Note"("categoryId");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");

-- AddForeignKey
ALTER TABLE "NoteCategory" ADD CONSTRAINT "NoteCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NoteCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
