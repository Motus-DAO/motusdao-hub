import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { parsePdfResources } from '@/lib/academy/media'
import { cuid } from '@/lib/academy/admin-course'
import { prisma } from '@/lib/prisma'
import { uploadAcademyPdf } from '@/lib/storage'

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
    const nameRaw = formData.get('name') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        pdfResources: true,
        module: { select: { courseId: true } },
      },
    })

    if (!lesson?.module?.courseId) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }

    const resourceId = cuid()
    const displayName = (nameRaw?.trim() || file.name || 'documento.pdf').slice(0, 255)

    const { storagePath } = await uploadAcademyPdf({
      file,
      courseId: lesson.module.courseId,
      lessonId: lesson.id,
      resourceId,
    })

    const existing = parsePdfResources(lesson.pdfResources)
    const pdfResources = [
      ...existing,
      {
        id: resourceId,
        name: displayName,
        storagePath,
        uploadedAt: new Date().toISOString(),
      },
    ]

    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        pdfResources,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      pdfResources,
    })
  } catch (error) {
    console.error('Error uploading lesson PDF:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('Invalid') || message.includes('too large') || message.includes('Unsupported')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}
