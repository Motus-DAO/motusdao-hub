import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { fromStorageRef, isStorageMediaRef, toStorageRef } from '@/lib/academy/media'
import { prisma } from '@/lib/prisma'
import { deleteAcademyMedia, uploadAcademyVideo } from '@/lib/storage'

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

    const { storagePath } = await uploadAcademyVideo({
      file,
      courseId: lesson.module.courseId,
      lessonId: lesson.id,
    })

    const videoUrl = toStorageRef(storagePath)
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        videoUrl,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      videoUrl,
      storagePath,
    })
  } catch (error) {
    console.error('Error uploading lesson video:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('Invalid') || message.includes('too large') || message.includes('Unsupported')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { lessonId } = await params
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, videoUrl: true },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }

    if (lesson.videoUrl && isStorageMediaRef(lesson.videoUrl)) {
      try {
        await deleteAcademyMedia(fromStorageRef(lesson.videoUrl))
      } catch (deleteError) {
        console.warn('Failed to delete academy video from storage:', deleteError)
      }
    }

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { videoUrl: null, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing lesson video:', error)
    return NextResponse.json({ error: 'No se pudo eliminar el video' }, { status: 500 })
  }
}
