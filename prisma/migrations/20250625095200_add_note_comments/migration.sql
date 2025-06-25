-- CreateTable
CREATE TABLE "NoteComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteComment_noteId_idx" ON "NoteComment"("noteId");

-- CreateIndex
CREATE INDEX "NoteComment_userId_idx" ON "NoteComment"("userId");

-- CreateIndex
CREATE INDEX "NoteComment_createdAt_idx" ON "NoteComment"("createdAt");

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
