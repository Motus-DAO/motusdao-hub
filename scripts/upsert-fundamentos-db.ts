/**
 * Upsert Bloque 02 — Fundamentos to DB from canonical seed.
 * Usage: npx tsx scripts/upsert-fundamentos-db.ts
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { seedAcademyFundamentos } from '../prisma/data/academy-fundamentos'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

async function main() {
  const course = await seedAcademyFundamentos(prisma)
  console.log(`✅ Fundamentos DB: /academia/${course.slug}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
