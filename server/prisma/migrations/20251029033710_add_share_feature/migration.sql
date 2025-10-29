-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "sharedPostId" TEXT;

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Share_postId_idx" ON "Share"("postId");

-- CreateIndex
CREATE INDEX "Share_userId_idx" ON "Share"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Share_postId_userId_key" ON "Share"("postId", "userId");

-- CreateIndex
CREATE INDEX "Post_sharedPostId_idx" ON "Post"("sharedPostId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_sharedPostId_fkey" FOREIGN KEY ("sharedPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
