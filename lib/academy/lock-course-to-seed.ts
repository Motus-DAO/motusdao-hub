import { mkdirSync, writeFileSync, readdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CourseDifficulty, PrismaClient } from '@prisma/client'
import { parsePdfResources } from '@/lib/academy/media'
import { upsertAcademyCourse, type SeedCourse } from '@/prisma/data/academy-seed-shared'

export type LockCourseResult = {
  slug: string
  title: string
  moduleCount: number
  lessonCount: number
  writtenPaths: string[]
  canonicalSeedUpdated: boolean
  canonicalSeedPath: string | null
  filesystemWritable: boolean
  seedTs: string
  backupJsonPath: string | null
}

function canWriteSeedFiles(): boolean {
  if (process.env.VERCEL) return false
  if (process.env.ALLOW_SEED_WRITE === 'false') return false
  return existsSync(join(process.cwd(), 'prisma', 'data'))
}

function lockedDir() {
  return join(process.cwd(), 'prisma', 'data', 'locked')
}

function backupsDir() {
  return join(process.cwd(), 'prisma', 'data', 'backups')
}

function exportConstName(slug: string): string {
  const cleaned = slug
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
  const body = `${cleaned || 'COURSE'}_COURSE`
  return /^[A-Z]/.test(body) ? body : `COURSE_${body}`
}

function serializeSeedCourseTs(course: SeedCourse, exportName: string): string {
  const body = JSON.stringify(course, null, 2)
  return `import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from '../academy-seed-shared'

/** Locked from admin dashboard — do not hand-edit unless intentional. */
export const ${exportName}: SeedCourse = ${body}

export async function seedLocked_${exportName}(prisma: PrismaClient) {
  return upsertAcademyCourse(prisma, ${exportName})
}
`
}

function serializeGenesisFile(course: SeedCourse): string {
  const body = JSON.stringify(course, null, 2)
  return `import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from './academy-seed-shared'

export const PLACEHOLDER_COURSE_SLUGS = [
  'fundamentos-mindfulness',
  'manejo-ansiedad-estres',
  'comunicacion-asertiva',
  'fundamentales-de-la-psicoterapia',
] as const

/** Locked from admin — ${new Date().toISOString()} */
export const GENESIS_COURSE: SeedCourse = ${body}

/** Upsert Génesis only. Does not touch other route blocks or admin-only courses. */
export async function seedAcademyGenesis(prisma: PrismaClient) {
  return upsertAcademyCourse(prisma, GENESIS_COURSE)
}

/** Full ruta kickoff helper — also removes legacy placeholder course slugs. */
export async function seedAcademyGenesisWithCleanup(prisma: PrismaClient) {
  await prisma.course.deleteMany({ where: { slug: { in: [...PLACEHOLDER_COURSE_SLUGS] } } })
  return seedAcademyGenesis(prisma)
}
`
}

function serializeFundamentosFile(course: SeedCourse): string {
  const body = JSON.stringify(course, null, 2)
  return `import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from './academy-seed-shared'

/** Locked from admin — ${new Date().toISOString()} */
export const FUNDAMENTOS_COURSE: SeedCourse = ${body}

export async function seedAcademyFundamentos(prisma: PrismaClient) {
  return upsertAcademyCourse(prisma, FUNDAMENTOS_COURSE)
}
`
}

function toSeedCourse(row: {
  id: string
  slug: string
  title: string
  summary: string
  description: string | null
  category: string | null
  difficulty: CourseDifficulty | null
  isPublished: boolean
  isFree: boolean
  priceAmount: { toString(): string } | null
  priceCurrency: string
  instructor: string | null
  instructorTitle: string | null
  learningOutcomes: unknown
  modules: Array<{
    id: string
    title: string
    summary: string | null
    order: number
    lessons: Array<{
      id: string
      title: string
      slug: string
      summary: string | null
      contentMDX: string | null
      order: number
      duration: number | null
      isFreePreview: boolean
      videoUrl: string | null
      pdfResources: unknown
    }>
  }>
}): SeedCourse {
  const outcomes = Array.isArray(row.learningOutcomes)
    ? row.learningOutcomes.filter((item): item is string => typeof item === 'string')
    : []

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description || '',
    category: row.category || 'General',
    difficulty: row.difficulty || 'beginner',
    isPublished: row.isPublished,
    isFree: row.isFree,
    ...(row.priceAmount != null
      ? { priceAmount: Number(row.priceAmount.toString()), priceCurrency: row.priceCurrency }
      : { priceCurrency: row.priceCurrency }),
    instructor: row.instructor || 'MotusDAO',
    instructorTitle: row.instructorTitle || 'Academia de Psicología Digital',
    learningOutcomes: outcomes,
    modules: row.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      summary: mod.summary || '',
      order: mod.order,
      lessons: mod.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        order: lesson.order,
        duration: lesson.duration ?? 0,
        isFreePreview: lesson.isFreePreview,
        summary: lesson.summary || '',
        contentMDX: lesson.contentMDX || '',
        videoUrl: lesson.videoUrl,
        pdfResources: parsePdfResources(lesson.pdfResources),
      })),
    })),
  }
}

/**
 * Snapshot a course from DB into seed files (admin "lock to seed").
 * Always writes prisma/data/locked/<slug>.{ts,json}.
 * Also updates canonical seed for 01-genesis / 02-fundamentos when writable.
 */
export async function lockCourseToSeed(
  prisma: PrismaClient,
  courseId: string,
): Promise<LockCourseResult> {
  const row = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: { orderBy: { order: 'asc' } },
        },
      },
    },
  })

  if (!row) {
    throw new Error('COURSE_NOT_FOUND')
  }

  const seedCourse = toSeedCourse(row)
  const exportName = exportConstName(row.slug)
  const seedTs = serializeSeedCourseTs(seedCourse, exportName)
  const lessonCount = seedCourse.modules.reduce((n, m) => n + m.lessons.length, 0)
  const writable = canWriteSeedFiles()
  const writtenPaths: string[] = []
  let canonicalSeedUpdated = false
  let canonicalSeedPath: string | null = null
  let backupJsonPath: string | null = null

  if (writable) {
    mkdirSync(lockedDir(), { recursive: true })
    mkdirSync(backupsDir(), { recursive: true })

    const lockedTsPath = join(lockedDir(), `${row.slug}.ts`)
    const lockedJsonPath = join(lockedDir(), `${row.slug}.json`)
    writeFileSync(lockedTsPath, seedTs, 'utf8')
    writeFileSync(
      lockedJsonPath,
      JSON.stringify(
        {
          lockedAt: new Date().toISOString(),
          source: 'admin-lock-to-seed',
          course: seedCourse,
        },
        null,
        2,
      ),
      'utf8',
    )
    writtenPaths.push(lockedTsPath, lockedJsonPath)

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    backupJsonPath = join(backupsDir(), `academy-${row.slug}.locked.${stamp}.json`)
    writeFileSync(
      backupJsonPath,
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          source: 'admin-lock-to-seed',
          courseCount: 1,
          courses: [
            {
              ...row,
              priceAmount: row.priceAmount == null ? null : row.priceAmount.toString(),
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    )
    writtenPaths.push(backupJsonPath)

    if (row.slug === '01-genesis') {
      canonicalSeedPath = join(process.cwd(), 'prisma', 'data', 'academy-genesis.ts')
      writeFileSync(canonicalSeedPath, serializeGenesisFile(seedCourse), 'utf8')
      writtenPaths.push(canonicalSeedPath)
      canonicalSeedUpdated = true
    } else if (row.slug === '02-fundamentos') {
      canonicalSeedPath = join(process.cwd(), 'prisma', 'data', 'academy-fundamentos.ts')
      writeFileSync(canonicalSeedPath, serializeFundamentosFile(seedCourse), 'utf8')
      writtenPaths.push(canonicalSeedPath)
      canonicalSeedUpdated = true
    }
  }

  return {
    slug: row.slug,
    title: row.title,
    moduleCount: seedCourse.modules.length,
    lessonCount,
    writtenPaths: writtenPaths.map((p) => p.replace(process.cwd() + '/', '')),
    canonicalSeedUpdated,
    canonicalSeedPath: canonicalSeedPath
      ? canonicalSeedPath.replace(process.cwd() + '/', '')
      : null,
    filesystemWritable: writable,
    seedTs,
    backupJsonPath: backupJsonPath ? backupJsonPath.replace(process.cwd() + '/', '') : null,
  }
}

/** Upsert every course snapshot under prisma/data/locked/*.json */
export async function seedAllLockedCourses(prisma: PrismaClient) {
  const dir = lockedDir()
  if (!existsSync(dir)) {
    console.log('No prisma/data/locked/ directory — nothing to seed')
    return []
  }

  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const upserted: string[] = []

  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { course: SeedCourse }
    if (!raw?.course?.slug) continue
    await upsertAcademyCourse(prisma, raw.course)
    upserted.push(raw.course.slug)
  }

  return upserted
}
