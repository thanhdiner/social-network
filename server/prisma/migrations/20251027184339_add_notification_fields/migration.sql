-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "actorAvatar" TEXT,
ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "actorName" TEXT,
ADD COLUMN     "relatedId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
