-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "pinnedAt" TIMESTAMP(3),
ADD COLUMN     "pinnedById" TEXT;

-- CreateIndex
CREATE INDEX "Message_pinnedById_idx" ON "Message"("pinnedById");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
