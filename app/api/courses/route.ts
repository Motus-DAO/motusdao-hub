import { NextResponse } from 'next/server'
import { lessonPreviewExcerpt } from '@/lib/academy/lesson-preview-excerpt'
import { LEGACY_CURSO_ONLINE_SLUGS } from '@/lib/academy/praxis-catalog'
import { sortRouteBlockCourses } from '@/lib/academy/route-blocks'
import { prisma } from '@/lib/prisma'

const publicLessonSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  duration: true,
  order: true,
  isPublished: true,
  isFreePreview: true,
  contentMDX: true,
} as const

export async function GET() {
  try {
    const rows = await prisma.course.findMany({
      where: { isPublished: true, slug: { notIn: [...LEGACY_CURSO_ONLINE_SLUGS] } },
      include: {
        modules: {
          include: {
            lessons: {
              where: { isPublished: true },
              select: publicLessonSelect,
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    const mapped = rows.map((course) => ({
      ...course,
      modules: course.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map(({ contentMDX, ...lesson }) => ({
          ...lesson,
          previewExcerpt: lesson.isFreePreview ? lessonPreviewExcerpt(contentMDX) : null,
        })),
      })),
    }))

    const courses = sortRouteBlockCourses(mapped)

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
