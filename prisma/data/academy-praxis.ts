import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'
import {
  PRAXIS_BLOCK_ID,
  PRAXIS_BLOCK_SLUG,
  PRAXIS_CATEGORY,
  PRAXIS_COLLECTION_BENJAMIN,
  PRAXIS_LEGACY_MEDIA_BY_SLUG,
  PRAXIS_PRODUCTS,
  type PraxisProduct,
} from '@/lib/academy/praxis-catalog'
import {
  applyPublicAuthorAttribution,
  applyPublicAuthorName,
  durationFromBody,
  extractBulletOutcomes,
  firstParagraph,
  lessonBodyWithoutRepeatedTitle,
  parsePraxisMarkdown,
  stripInterfaceProgressSpec,
} from '@/lib/academy/praxis-md'
import { slugifyCourseTitle } from '@/lib/academy/slug'
import { upsertAcademyCourse, type SeedCourse, type SeedLesson, type SeedModule } from './academy-seed-shared'

const PRAXIS_MD_DIR = join(process.cwd(), 'prisma', 'data', 'praxis')

function readPraxisMarkdown(fileName: string): string {
  return readFileSync(join(PRAXIS_MD_DIR, fileName), 'utf8')
}

function contentMdx(title: string, body: string): string {
  return applyPublicAuthorAttribution(lessonBodyWithoutRepeatedTitle(title, stripInterfaceProgressSpec(body)))
}

function uniqueSlug(title: string, used: Set<string>): string {
  const base = slugifyCourseTitle(title) || 'leccion'
  let slug = base
  let n = 2
  while (used.has(slug)) {
    slug = `${base}-${n}`
    n += 1
  }
  used.add(slug)
  return slug
}

function isCatalogOnlySection(title: string): boolean {
  const normalized = title.toLowerCase()
  return (
    normalized.startsWith('catálogo destacado') ||
    normalized.startsWith('catalogo destacado') ||
    normalized.startsWith('nota profesional') ||
    normalized.startsWith('colección benjamin') ||
    normalized.startsWith('colección maestro benjamin')
  )
}

function buildModulesFromMarkdown(
  source: string,
  ids: { courseId: string; modulePrefix: string; lessonPrefix: string },
  mediaByLessonSlug: Array<{ lessonSlug: string; videoUrl?: string; pdfResources?: SeedLesson['pdfResources'] }> = [],
): { modules: SeedModule[]; intro: string; outcomes: string[] } {
  const parsed = parsePraxisMarkdown(source)
  const lessonSlugs = new Set<string>()
  const modules: SeedModule[] = parsed.modules.map((mod, moduleIndex) => {
    const lessons: SeedLesson[] = mod.lessons.map((lesson, lessonIndex) => {
      const title = applyPublicAuthorName(lesson.title || `Lección ${lessonIndex + 1}`)
      const slug = uniqueSlug(title, lessonSlugs)
      const media = mediaByLessonSlug.find((item) => item.lessonSlug === slug)
      const contentMDX = contentMdx(title, lesson.body)
      return {
        id: `${ids.lessonPrefix}_${slug}`,
        title,
        slug,
        order: lessonIndex + 1,
        duration: durationFromBody(lesson.body),
        isFreePreview: moduleIndex === 0 && lessonIndex === 0,
        summary: '',
        contentMDX,
        ...(media?.videoUrl ? { videoUrl: media.videoUrl } : {}),
        ...(media?.pdfResources ? { pdfResources: media.pdfResources } : {}),
      }
    })

    return {
      id: `${ids.modulePrefix}_${moduleIndex + 1}`,
      title: applyPublicAuthorName(mod.title),
      summary: '',
      order: moduleIndex + 1,
      lessons,
    }
  })

  const lastModule = modules[modules.length - 1]
  if (lastModule) {
    for (const section of parsed.trailingSections) {
      if (isCatalogOnlySection(section.title)) continue
      const title = applyPublicAuthorName(section.title)
      const slug = uniqueSlug(title, lessonSlugs)
      lastModule.lessons.push({
        id: `${ids.lessonPrefix}_${slug}`,
        title,
        slug,
        order: lastModule.lessons.length + 1,
        duration: durationFromBody(section.body),
        isFreePreview: false,
        summary: '',
        contentMDX: contentMdx(title, section.body),
      })
    }
  }

  const intro = applyPublicAuthorAttribution(parsed.intro.replace(/^# [^\n]+\n+/, '').trim())
  const outcomes = extractBulletOutcomes(parsed.intro)
  return { modules, intro, outcomes }
}

export function buildPraxisBlockCourse(): SeedCourse {
  const source = readPraxisMarkdown('00-bloque-03-praxis.md')
  const { modules, intro, outcomes } = buildModulesFromMarkdown(source, {
    courseId: PRAXIS_BLOCK_ID,
    modulePrefix: 'module_praxis',
    lessonPrefix: 'lesson_praxis',
  })

  return {
    id: PRAXIS_BLOCK_ID,
    slug: PRAXIS_BLOCK_SLUG,
    title: '03 — Praxis',
    summary: 'Formación aplicada para tu práctica profesional. Cursos y talleres desde USD 15.',
    description: intro,
    category: 'Ruta PSM',
    difficulty: 'intermediate',
    isPublished: true,
    isFree: true,
    priceAmount: 0,
    priceCurrency: 'USD',
    instructor: 'MotusDAO',
    instructorTitle: 'Academia de Psicología Digital',
    learningOutcomes: outcomes,
    modules: modules.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((lesson) => ({ ...lesson, isFreePreview: true })),
    })),
  }
}

function difficultyForProduct(product: PraxisProduct): SeedCourse['difficulty'] {
  return product.type === 'program' ? 'advanced' : 'intermediate'
}

export function buildPraxisCatalogCourse(product: PraxisProduct): SeedCourse {
  if (!product.courseId) {
    throw new Error(`Praxis product ${product.slug} has no courseId`)
  }

  const source = readPraxisMarkdown(product.sourceFile)
  const parsed = parsePraxisMarkdown(source)
  const { modules, intro, outcomes } = buildModulesFromMarkdown(
    source,
    {
      courseId: product.courseId,
      modulePrefix: `module_${product.slug.replace(/-/g, '_')}`,
      lessonPrefix: `lesson_${product.slug.replace(/-/g, '_')}`,
    },
    PRAXIS_LEGACY_MEDIA_BY_SLUG[product.slug] ?? [],
  )

  const subtitle = parsed.frontmatter.subtitle || firstParagraph(intro)
  const authorLine = parsed.frontmatter.author || product.author || PRAXIS_COLLECTION_BENJAMIN

  return {
    id: product.courseId,
    slug: product.slug,
    title: product.title,
    summary: product.summary,
    description: intro || subtitle,
    category: PRAXIS_CATEGORY,
    difficulty: difficultyForProduct(product),
    isPublished: true,
    isFree: false,
    priceAmount: product.priceUsd,
    priceCurrency: 'USD',
    instructor: applyPublicAuthorAttribution(product.author || PRAXIS_COLLECTION_BENJAMIN),
    instructorTitle: applyPublicAuthorAttribution(authorLine),
    learningOutcomes: outcomes,
    modules,
  }
}

export function buildPraxisCatalogCourses(): SeedCourse[] {
  return PRAXIS_PRODUCTS.filter((product) => product.courseId).map(buildPraxisCatalogCourse)
}

export async function seedAcademyPraxis(prisma: PrismaClient) {
  const block = await upsertAcademyCourse(prisma, buildPraxisBlockCourse())
  const catalog = []
  for (const course of buildPraxisCatalogCourses()) {
    catalog.push(await upsertAcademyCourse(prisma, course))
  }
  return { block, catalog }
}

export async function archiveLegacyCursoOnline(prisma: PrismaClient) {
  const result = await prisma.course.updateMany({
    where: { slug: 'curso-online' },
    data: { isPublished: false },
  })
  if (result.count > 0) {
    console.log('📦 Archived legacy course slug=curso-online (unpublished, not deleted)')
  }
  return result.count
}
