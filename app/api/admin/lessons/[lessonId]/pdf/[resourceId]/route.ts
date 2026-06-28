import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { parsePdfResources } from '@/lib/academy/media'
import { prisma } from '@/lib/prisma'
import { deleteAcademyMedia } from '@/lib/storage'

type RouteContext = {
  params: Promise<{ lessonId: string; resourceId: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { lessonId, resourceId } = await params

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, pdfResources: true },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }

    const existing = parsePdfResources(lesson.pdfResources)
    const target = existing.find((resource) => resource.id === resourceId)

    if (!target) {
      return NextResponse.json({ error: 'Recurso PDF no encontrado' }, { status: 404 })
    }

    const pdfResources = existing.filter((resource) => resource.id !== resourceId)

    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        pdfResources,
        updatedAt: new Date(),
      },
    })

    try {
      await deleteAcademyMedia(target.storagePath)
    } catch (deleteError) {
      console.warn('Failed to delete academy PDF from storage:', deleteError)
    }

    return NextResponse.json({
      success: true,
      pdfResources,
    })
  } catch (error) {
    console.error('Error deleting lesson PDF:', error)
    return NextResponse.json({ error: 'No se pudo eliminar el PDF' }, { status: 500 })
  }
}
