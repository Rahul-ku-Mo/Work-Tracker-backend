-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "contentId" TEXT,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT,
ADD COLUMN     "type" TEXT;

-- CreateTable
CREATE TABLE "mentions" (
    "id" TEXT NOT NULL,
    "mentionedId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentions_contentType_contentId_idx" ON "mentions"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "mentions_contentId_idx" ON "mentions"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "mentions_mentionedId_contentType_contentId_key" ON "mentions"("mentionedId", "contentType", "contentId");

-- CreateIndex
CREATE INDEX "Notification_receiverId_idx" ON "Notification"("receiverId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_contentType_contentId_idx" ON "Notification"("contentType", "contentId");

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_mentionedId_fkey" FOREIGN KEY ("mentionedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
