-- Align ConversationCustomization columns with updated Prisma schema
ALTER TABLE "ConversationCustomization" DROP CONSTRAINT IF EXISTS "ConversationCustomization_userOneId_fkey";
ALTER TABLE "ConversationCustomization" DROP CONSTRAINT IF EXISTS "ConversationCustomization_userTwoId_fkey";
ALTER TABLE "ConversationCustomization" DROP CONSTRAINT IF EXISTS "ConversationCustomization_updatedById_fkey";

DROP INDEX IF EXISTS "ConversationCustomization_userOneId_userTwoId_key";

ALTER TABLE "ConversationCustomization" RENAME COLUMN "userOneId" TO "userAId";
ALTER TABLE "ConversationCustomization" RENAME COLUMN "userTwoId" TO "userBId";
ALTER TABLE "ConversationCustomization" RENAME COLUMN "nicknameUserOne" TO "nicknameForUserA";
ALTER TABLE "ConversationCustomization" RENAME COLUMN "nicknameUserTwo" TO "nicknameForUserB";

ALTER TABLE "ConversationCustomization" ALTER COLUMN "updatedById" DROP NOT NULL;

CREATE UNIQUE INDEX "ConversationCustomization_userAId_userBId_key" ON "ConversationCustomization"("userAId", "userBId");

ALTER TABLE "ConversationCustomization"
  ADD CONSTRAINT "ConversationCustomization_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationCustomization"
  ADD CONSTRAINT "ConversationCustomization_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationCustomization"
  ADD CONSTRAINT "ConversationCustomization_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
