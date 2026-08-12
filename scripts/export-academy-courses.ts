/**
 * Export all Academy courses (modules + lessons) from the DB to JSON.
 * Does NOT modify the database.
 *
 * Usage:
 *   npx tsx scripts/export-academy-courses.ts
 *   npx tsx scripts/export-academy-courses.ts --slug=curso-online
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

function argValue(flag: string): string | undefined {
  const prefix = `${flag}=`
  const hit = process.argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : undefined
}

async function main() {
  const slugFilter = argValue('--slug')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = join(process.cwd(), 'prisma', 'data', 'backups')
  mkdirSync(outDir, { recursive: true })

  const courses = await prisma.course.findMany({
    where: slugFilter ? { slug: slugFilter } : undefined,
    orderBy: { updatedAt: 'desc' },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  })

  if (courses.length === 0) {
    console.error(
      slugFilter
        ? `No course found with slug "${slugFilter}".`
        : 'No courses found in this database.',
    )
    process.exit(1)
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'scripts/export-academy-courses.ts',
    note: 'Full Course → Module → Lesson snapshot for restore. Enrollments/progress are NOT included.',
    courseCount: courses.length,
    courses: courses.map((c) => ({
      ...c,
      priceAmount: c.priceAmount == null ? null : c.priceAmount.toString(),
      modules: c.modules.map((m) => ({
        ...m,
        lessons: m.lessons,
      })),
    })),
  }

  const label = slugFilter ? slugFilter : 'all-courses'
  const outPath = join(outDir, `academy-${label}.${stamp}.json`)
  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')

  console.log(`✅ Exported ${courses.length} course(s) → ${outPath}`)
  for (const c of courses) {
    const lessonCount = c.modules.reduce((n, m) => n + m.lessons.length, 0)
    console.log(
      `   - ${c.slug} | ${c.title} | ${c.modules.length} modules | ${lessonCount} lessons | published=${c.isPublished}`,
    )
  }
}

main()
  .catch((error) => {
    console.error('❌ Export failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
