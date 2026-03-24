/**
 * Seed script: create the first admin account
 * Run: node prisma/seed-admin.mjs
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.admin.findFirst({
    where: { username: 'superadmin' },
  })

  if (existing) {
    console.log('✅  Admin account already exists:')
    console.log(`    Username : superadmin`)
    console.log(`    Email    : admin@admin.com`)
    return
  }

  const hashed = await bcrypt.hash('123123', 10)

  const admin = await prisma.admin.create({
    data: {
      username: 'superadmin',
      email: 'admin@admin.com',
      password: hashed,
      name: 'Super Admin',
    },
  })

  console.log('✅  Admin account created successfully!')
  console.log(`    ID       : ${admin.id}`)
  console.log(`    Username : ${admin.username}`)
  console.log(`    Email    : ${admin.email}`)
  console.log(`    Password : 123123`)
  console.log()
  console.log('  → Login at: http://localhost:5173/admin/login')
}

main()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error('❌  Error:', err.message)
    prisma.$disconnect()
    process.exit(1)
  })
