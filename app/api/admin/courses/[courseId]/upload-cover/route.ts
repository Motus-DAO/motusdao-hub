import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'
import {
  courseCoverStoragePathFromUrl,
  deleteCourseCover,
  uploadCourseCover,
} from '@/lib/storage'

type RouteContext = {
  params: Promise<{ courseId: string }>
}

async function removeStoredCover(imageUrl: string | null | undefined) {
  const storagePath = courseCoverStoragePathFromUrl(imageUrl)
  if (!storagePath) return
  try {
    await deleteCourseCover(storagePath)
  } catch (deleteError) {
    console.warn('Failed to delete course cover from storage:', deleteError)
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { courseId } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, imageUrl: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    await removeStoredCover(course.imageUrl)

    const { storagePath, publicUrl } = await uploadCourseCover({
      file,
      courseId: course.id,
    })

    await prisma.course.update({
      where: { id: courseId },
      data: {
        imageUrl: publicUrl,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      storagePath,
    })
  } catch (error) {
    console.error('Error uploading course cover:', error)
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
    const { courseId } = await params
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, imageUrl: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    await removeStoredCover(course.imageUrl)

    await prisma.course.update({
      where: { id: courseId },
      data: {
        imageUrl: null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing course cover:', error)
    return NextResponse.json({ error: 'No se pudo eliminar la portada' }, { status: 500 })
  }
}
