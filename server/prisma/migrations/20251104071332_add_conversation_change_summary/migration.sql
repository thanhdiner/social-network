-- DropIndex
DROP INDEX "public"."ConversationCustomization_updatedById_idx";

-- AlterTable
ALTER TABLE "ConversationCustomization" ADD COLUMN     "changeSummary" TEXT;

-- CreateIndex
CREATE INDEX "ConversationCustomization_userAId_idx" ON "ConversationCustomization"("userAId");

-- CreateIndex
CREATE INDEX "ConversationCustomization_userBId_idx" ON "ConversationCustomization"("userBId");
