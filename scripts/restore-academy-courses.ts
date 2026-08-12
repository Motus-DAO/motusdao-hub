/**
 * Restore Academy courses from a JSON backup created by export-academy-courses.ts.
 * Upserts Course / Module / Lesson by id. Does NOT delete extra lessons/modules
 * that exist in DB but not in the backup (safe by default).
 *
 * Usage:
 *   npx tsx scripts/restore-academy-courses.ts prisma/data/backups/academy-all-courses.<stamp>.json
 *   npx tsx scripts/restore-academy-courses.ts <path> --slug=curso-online
 */
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { PrismaClient, type Prisma } from '@prisma/client'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

type BackupLesson = {
  id: string
  title: string
  slug: string
  contentMDX: string | null
  order: number
  duration: number | null
  isPublished: boolean
  moduleId: string | null
  summary: string | null
  isFreePreview: boolean
  pdfResources: Prisma.JsonValue | null
  videoUrl: string | null
  createdAt?: string
  updatedAt?: string
}

type BackupModule = {
  id: string
  courseId: string
  title: string
  summary: string | null
  order: number
  createdAt?: string
  updatedAt?: string
  lessons: BackupLesson[]
}

type BackupCourse = {
  id: string
  title: string
  slug: string
  summary: string
  description: string | null
  imageUrl: string | null
  isPublished: boolean
  category: string | null
  difficulty: string | null
  instructor: string | null
  instructorBio: string | null
  instructorImage: string | null
  instructorTitle: string | null
  lastUpdated: string | null
  learningOutcomes: Prisma.JsonValue | null
  rating: number | null
  reviewCount: number | null
  priceAmount: string | null
  priceCurrency: string
  billingInterval: string
  isFree: boolean
  createdAt?: string
  updatedAt?: string
  modules: BackupModule[]
}

type BackupFile = {
  exportedAt: string
  courses: BackupCourse[]
}

function argValue(flag: string): string | undefined {
  const prefix = `${flag}=`
  const hit = process.argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : undefined
}

async function main() {
  const path = process.argv[2]
  if (!path || path.startsWith('--')) {
    console.error(
      'Usage: npx tsx scripts/restore-academy-courses.ts <backup.json> [--slug=curso-online]',
    )
    process.exit(1)
  }

  const slugFilter = argValue('--slug')
  const raw = JSON.parse(readFileSync(path, 'utf8')) as BackupFile
  const courses = (raw.courses ?? []).filter((c) =>
    slugFilter ? c.slug === slugFilter : true,
  )

  if (courses.length === 0) {
    console.error(
      slugFilter
        ? `No course with slug "${slugFilter}" in backup.`
        : 'Backup has no courses.',
    )
    process.exit(1)
  }

  console.log(`Restoring ${courses.length} course(s) from ${path}`)
  console.log(`Backup exportedAt: ${raw.exportedAt ?? 'unknown'}`)

  for (const c of courses) {
    const now = new Date()
    await prisma.course.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        description: c.description,
        imageUrl: c.imageUrl,
        isPublished: c.isPublished,
        category: c.category,
        difficulty: (c.difficulty as never) ?? 'beginner',
        instructor: c.instructor,
        instructorBio: c.instructorBio,
        instructorImage: c.instructorImage,
        instructorTitle: c.instructorTitle,
        lastUpdated: c.lastUpdated,
        learningOutcomes: c.learningOutcomes ?? undefined,
        rating: c.rating ?? 0,
        reviewCount: c.reviewCount ?? 0,
        priceAmount: c.priceAmount,
        priceCurrency: c.priceCurrency ?? 'MXN',
        billingInterval: (c.billingInterval as never) ?? 'one_time',
        isFree: c.isFree,
        updatedAt: now,
      },
      update: {
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        description: c.description,
        imageUrl: c.imageUrl,
        isPublished: c.isPublished,
        category: c.category,
        difficulty: (c.difficulty as never) ?? undefined,
        instructor: c.instructor,
        instructorBio: c.instructorBio,
        instructorImage: c.instructorImage,
        instructorTitle: c.instructorTitle,
        lastUpdated: c.lastUpdated,
        learningOutcomes: c.learningOutcomes ?? undefined,
        rating: c.rating ?? undefined,
        reviewCount: c.reviewCount ?? undefined,
        priceAmount: c.priceAmount,
        priceCurrency: c.priceCurrency,
        billingInterval: (c.billingInterval as never) ?? undefined,
        isFree: c.isFree,
        updatedAt: now,
      },
    })

    for (const m of c.modules) {
      await prisma.module.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          courseId: c.id,
          title: m.title,
          summary: m.summary,
          order: m.order,
          updatedAt: now,
        },
        update: {
          courseId: c.id,
          title: m.title,
          summary: m.summary,
          order: m.order,
          updatedAt: now,
        },
      })

      for (const l of m.lessons) {
        await prisma.lesson.upsert({
          where: { id: l.id },
          create: {
            id: l.id,
            moduleId: m.id,
            title: l.title,
            slug: l.slug,
            contentMDX: l.contentMDX,
            order: l.order,
            duration: l.duration,
            isPublished: l.isPublished,
            summary: l.summary,
            isFreePreview: l.isFreePreview,
            pdfResources: l.pdfResources ?? undefined,
            videoUrl: l.videoUrl,
            updatedAt: now,
          },
          update: {
            moduleId: m.id,
            title: l.title,
            slug: l.slug,
            contentMDX: l.contentMDX,
            order: l.order,
            duration: l.duration,
            isPublished: l.isPublished,
            summary: l.summary,
            isFreePreview: l.isFreePreview,
            pdfResources: l.pdfResources ?? undefined,
            videoUrl: l.videoUrl,
            updatedAt: now,
          },
        })
      }
    }

    const lessonCount = c.modules.reduce((n, m) => n + m.lessons.length, 0)
    console.log(
      `✅ ${c.slug}: ${c.modules.length} modules, ${lessonCount} lessons restored (upsert, no deletes)`,
    )
  }
}

main()
  .catch((error) => {
    console.error('❌ Restore failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
