/*
  Warnings:

  - A unique constraint covering the columns `[postId,userId,imageIndex]` on the table `Like` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Like_postId_userId_key";

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "imageIndex" INTEGER;

-- CreateIndex
CREATE INDEX "Like_postId_imageIndex_idx" ON "Like"("postId", "imageIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Like_postId_userId_imageIndex_key" ON "Like"("postId", "userId", "imageIndex");
