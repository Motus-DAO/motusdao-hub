import { NextRequest, NextResponse } from 'next/server'
import { cuid } from '@/lib/academy/admin-course'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'
import { uploadAcademyLessonImage } from '@/lib/storage'

type RouteContext = {
  params: Promise<{ lessonId: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { lessonId } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        module: { select: { courseId: true } },
      },
    })

    if (!lesson?.module?.courseId) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }

    const resourceId = cuid()
    const { storagePath, publicUrl } = await uploadAcademyLessonImage({
      file,
      courseId: lesson.module.courseId,
      lessonId: lesson.id,
      resourceId,
    })

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      storagePath,
    })
  } catch (error) {
    console.error('Error uploading lesson image:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('Invalid') || message.includes('too large') || message.includes('Unsupported')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}
