-- CreateTable
CREATE TABLE "MutedConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutedConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MutedConversation_userId_idx" ON "MutedConversation"("userId");

-- CreateIndex
CREATE INDEX "MutedConversation_mutedUserId_idx" ON "MutedConversation"("mutedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MutedConversation_userId_mutedUserId_key" ON "MutedConversation"("userId", "mutedUserId");
