/*
  Warnings:

  - You are about to drop the column `cardId` on the `Note` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_cardId_fkey";

-- DropIndex
DROP INDEX "Note_cardId_idx";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "cardId",
ADD COLUMN     "category" TEXT;

-- CreateTable
CREATE TABLE "CardNote" (
    "id" TEXT NOT NULL,
    "cardId" INTEGER NOT NULL,
    "noteId" TEXT NOT NULL,
    "attachedBy" TEXT NOT NULL,
    "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardNote_cardId_idx" ON "CardNote"("cardId");

-- CreateIndex
CREATE INDEX "CardNote_noteId_idx" ON "CardNote"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "CardNote_cardId_noteId_key" ON "CardNote"("cardId", "noteId");

-- CreateIndex
CREATE INDEX "Note_category_idx" ON "Note"("category");

-- AddForeignKey
ALTER TABLE "CardNote" ADD CONSTRAINT "CardNote_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardNote" ADD CONSTRAINT "CardNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
