-- Optional note on each share
ALTER TABLE "ReelShare"
  ADD COLUMN "content" TEXT;

-- Keep track of share origin + caption directly on reels
ALTER TABLE "Reel"
  ADD COLUMN "shareContent" TEXT,
  ADD COLUMN "sharedFromId" TEXT;

-- Ensure referential integrity for shared reels
ALTER TABLE "Reel"
  ADD CONSTRAINT "Reel_sharedFromId_fkey"
  FOREIGN KEY ("sharedFromId") REFERENCES "Reel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Faster analytics on share history
CREATE INDEX "ReelShare_userId_reelId_idx" ON "ReelShare"("userId", "reelId");
CREATE INDEX "Reel_sharedFromId_idx" ON "Reel"("sharedFromId");

-- Add share metadata to Reel
ALTER TABLE "Reel" ADD COLUMN     "shareContent" TEXT,
ADD COLUMN     "sharedFromId" TEXT;

-- Track origin relationships
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_sharedFromId_fkey" FOREIGN KEY ("sharedFromId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old uniqueness if it exists and rely on index for analytics
ALTER TABLE "ReelShare" DROP CONSTRAINT IF EXISTS "ReelShare_reelId_userId_key";

-- Index sharedFrom lookups
CREATE INDEX "Reel_sharedFromId_idx" ON "Reel"("sharedFromId");
