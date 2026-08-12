/**
 * Upsert all courses locked from admin (prisma/data/locked/*.json).
 * Usage: npx tsx scripts/seed-academy-locked.ts
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { seedAllLockedCourses } from '../lib/academy/lock-course-to-seed'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

async function main() {
  const slugs = await seedAllLockedCourses(prisma)
  console.log(slugs.length ? `✅ Locked courses upserted: ${slugs.join(', ')}` : 'Nothing to upsert')
}

main()
  .catch((error) => {
    console.error('❌ seed-academy-locked failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
