/**
 * Upsert Bloque 03 Praxis + catalog products only.
 * Unpublishes legacy curso-online. Does not re-seed Génesis/Fundamentos/Validación/Portal.
 *
 * Usage: npx tsx scripts/seed-academy-praxis.ts
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { archiveLegacyCursoOnline, seedAcademyPraxis } from '../prisma/data/academy-praxis'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

async function main() {
  const result = await seedAcademyPraxis(prisma)
  await archiveLegacyCursoOnline(prisma)
  console.log(`Done. Block: /academia/${result.block.slug}`)
  for (const course of result.catalog) {
    console.log(`  Catalog: /academia/${course.slug}  ${course.title}`)
  }
}

main()
  .catch((error) => {
    console.error('❌ Praxis seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
