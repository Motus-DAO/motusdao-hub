import { NextResponse } from 'next/server'
import { lessonPreviewExcerpt } from '@/lib/academy/lesson-preview-excerpt'
import { isHiddenLegacyAcademySlug } from '@/lib/academy/praxis-catalog'
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

type RouteParams = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params
    if (isHiddenLegacyAcademySlug(slug)) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
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

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    const publicCourse = {
      ...course,
      modules: course.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map(({ contentMDX, ...lesson }) => ({
          ...lesson,
          previewExcerpt: lesson.isFreePreview ? lessonPreviewExcerpt(contentMDX) : null,
        })),
      })),
    }

    return NextResponse.json({ course: publicCourse })
  } catch (error) {
    console.error('Error fetching course by slug:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
