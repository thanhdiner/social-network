-- DropIndex
DROP INDEX "public"."Share_postId_userId_key";

-- CreateIndex
CREATE INDEX "Share_userId_postId_idx" ON "Share"("userId", "postId");
