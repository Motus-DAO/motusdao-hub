import { NextResponse } from 'next/server'
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
} as const

type RouteParams = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

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

    return NextResponse.json({ course })
  } catch (error) {
    console.error('Error fetching course by slug:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
