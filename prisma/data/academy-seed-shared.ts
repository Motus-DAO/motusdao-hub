import type { CourseDifficulty, PrismaClient } from '@prisma/client'

export type SeedLesson = {
  id: string
  title: string
  slug: string
  order: number
  duration: number
  isFreePreview: boolean
  summary: string
  contentMDX: string
}

export type SeedModule = {
  id: string
  title: string
  summary: string
  order: number
  lessons: SeedLesson[]
}

export type SeedCourse = {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  category: string
  difficulty: CourseDifficulty
  isPublished: boolean
  isFree: boolean
  priceAmount?: number
  priceCurrency?: string
  instructor: string
  instructorTitle: string
  learningOutcomes: string[]
  modules: SeedModule[]
}

export async function upsertAcademyCourse(prisma: PrismaClient, data: SeedCourse) {
  const now = new Date()

  const course = await prisma.course.upsert({
    where: { id: data.id },
    update: {
      slug: data.slug,
      title: data.title,
      summary: data.summary,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty,
      isPublished: data.isPublished,
      isFree: data.isFree,
      priceAmount: data.priceAmount ?? null,
      priceCurrency: data.priceCurrency ?? 'USD',
      instructor: data.instructor,
      instructorTitle: data.instructorTitle,
      learningOutcomes: data.learningOutcomes,
      updatedAt: now,
    },
    create: {
      id: data.id,
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty,
      isPublished: data.isPublished,
      isFree: data.isFree,
      priceAmount: data.priceAmount ?? null,
      priceCurrency: data.priceCurrency ?? 'USD',
      instructor: data.instructor,
      instructorTitle: data.instructorTitle,
      learningOutcomes: data.learningOutcomes,
      updatedAt: now,
    },
  })

  let lessonCount = 0
  const lessonIds: string[] = []

  for (const mod of data.modules) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: {
        courseId: course.id,
        title: mod.title,
        summary: mod.summary,
        order: mod.order,
        updatedAt: now,
      },
      create: {
        id: mod.id,
        courseId: course.id,
        title: mod.title,
        summary: mod.summary,
        order: mod.order,
        updatedAt: now,
      },
    })

    for (const lesson of mod.lessons) {
      lessonIds.push(lesson.id)
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: {
          moduleId: mod.id,
          title: lesson.title,
          slug: lesson.slug,
          summary: lesson.summary,
          contentMDX: lesson.contentMDX,
          order: lesson.order,
          duration: lesson.duration,
          isPublished: true,
          isFreePreview: lesson.isFreePreview,
          updatedAt: now,
        },
        create: {
          id: lesson.id,
          moduleId: mod.id,
          title: lesson.title,
          slug: lesson.slug,
          summary: lesson.summary,
          contentMDX: lesson.contentMDX,
          order: lesson.order,
          duration: lesson.duration,
          isPublished: true,
          isFreePreview: lesson.isFreePreview,
          updatedAt: now,
        },
      })
      lessonCount += 1
    }
  }

  const moduleIds = data.modules.map((mod) => mod.id)
  const removedModules = await prisma.module.deleteMany({
    where: {
      courseId: course.id,
      id: { notIn: moduleIds },
    },
  })

  const removedLessons = await prisma.lesson.deleteMany({
    where: {
      module: { courseId: course.id },
      id: { notIn: lessonIds },
    },
  })

  if (removedModules.count > 0 || removedLessons.count > 0) {
    console.log(
      `   🗑️  "${data.title}": removed ${removedModules.count} module(s), ${removedLessons.count} lesson(s)`,
    )
  }

  console.log(`✅ "${course.title}" (${data.modules.length} modules, ${lessonCount} lessons)`)
  return course
}
