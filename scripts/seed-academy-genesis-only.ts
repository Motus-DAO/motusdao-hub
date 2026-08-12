/**
 * Upsert ONLY Bloque 01 — Génesis. Does not re-seed Fundamentos/Praxis/etc.
 * Does not delete admin-only courses (e.g. curso-online).
 *
 * Usage: npx tsx scripts/seed-academy-genesis-only.ts
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { seedAcademyGenesis } from '../prisma/data/academy-genesis'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

async function main() {
  const course = await seedAcademyGenesis(prisma)
  console.log(`Done. View at /academia/${course.slug}`)
}

main()
  .catch((error) => {
    console.error('❌ Genesis-only seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
