import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateLessonSchema } from '@/lib/academy/admin-content'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type LessonRouteContext = {
  params: Promise<{ lessonId: string }>
}

export async function PATCH(request: NextRequest, { params }: LessonRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { lessonId } = await params
    const body = updateLessonSchema.parse(await request.json())
    const existing = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, moduleId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }
    if (!existing.moduleId) {
      return NextResponse.json({ error: 'La lección no está asociada a un módulo' }, { status: 400 })
    }

    if (body.slug) {
      const duplicate = await prisma.lesson.findFirst({
        where: {
          moduleId: existing.moduleId,
          slug: body.slug,
          id: { not: lessonId },
        },
        select: { id: true },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe una lección con ese slug en este módulo' },
          { status: 400 }
        )
      }
    }

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...body,
        summary: body.summary === '' ? null : body.summary,
        contentMDX: body.contentMDX === '' ? null : body.contentMDX,
        videoUrl: body.videoUrl === '' ? null : body.videoUrl,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ lesson })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Datos de la lección inválidos', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }

    console.error('Error updating lesson:', error)
    return NextResponse.json({ error: 'No se pudo actualizar la lección' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: LessonRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { lessonId } = await params
    await prisma.lesson.delete({ where: { id: lessonId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }

    console.error('Error deleting lesson:', error)
    return NextResponse.json({ error: 'No se pudo eliminar la lección' }, { status: 500 })
  }
}
