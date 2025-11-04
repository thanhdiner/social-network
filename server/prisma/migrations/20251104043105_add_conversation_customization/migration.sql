-- CreateTable
CREATE TABLE "ConversationCustomization" (
    "id" TEXT NOT NULL,
    "userOneId" TEXT NOT NULL,
    "userTwoId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL DEFAULT 'sunset',
    "emoji" TEXT NOT NULL DEFAULT '👍',
    "nicknameUserOne" TEXT,
    "nicknameUserTwo" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationCustomization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationCustomization_updatedById_idx" ON "ConversationCustomization"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationCustomization_userOneId_userTwoId_key" ON "ConversationCustomization"("userOneId", "userTwoId");

-- AddForeignKey
ALTER TABLE "ConversationCustomization" ADD CONSTRAINT "ConversationCustomization_userOneId_fkey" FOREIGN KEY ("userOneId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationCustomization" ADD CONSTRAINT "ConversationCustomization_userTwoId_fkey" FOREIGN KEY ("userTwoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationCustomization" ADD CONSTRAINT "ConversationCustomization_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
