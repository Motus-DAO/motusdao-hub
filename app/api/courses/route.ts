import { NextResponse } from 'next/server'
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
} as const

export async function GET() {
  try {
    const rows = await prisma.course.findMany({
      where: { isPublished: true },
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

    const courses = sortRouteBlockCourses(rows)

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
