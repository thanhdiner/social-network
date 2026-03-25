const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Test if FriendRequest table exists by querying it
    const count = await prisma.friendRequest.count();
    console.log('FriendRequest table EXISTS, count:', count);
  } catch (err) {
    console.log('FriendRequest table ERROR:', err.message);
    
    // If table doesn't exist, create it via raw SQL
    if (err.message.includes('does not exist') || err.message.includes('relation') || err.code === 'P2021') {
      console.log('Creating FriendRequest table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "FriendRequest" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "senderId" TEXT NOT NULL,
          "receiverId" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "FriendRequest_senderId_receiverId_key" UNIQUE ("senderId","receiverId"),
          CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FriendRequest_senderId_idx" ON "FriendRequest"("senderId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FriendRequest_receiverId_idx" ON "FriendRequest"("receiverId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FriendRequest_status_idx" ON "FriendRequest"("status")`);
      console.log('Table created successfully!');
      
      // Verify
      const count2 = await prisma.friendRequest.count();
      console.log('Verified count:', count2);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
