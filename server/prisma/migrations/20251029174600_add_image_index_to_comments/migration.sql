-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "imageIndex" INTEGER;

-- CreateIndex
CREATE INDEX "Comment_postId_imageIndex_idx" ON "Comment"("postId", "imageIndex");
