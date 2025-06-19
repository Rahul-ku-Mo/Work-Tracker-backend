-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Note_isPublic_idx" ON "Note"("isPublic");
