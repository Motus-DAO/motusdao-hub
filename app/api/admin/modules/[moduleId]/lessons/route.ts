import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLessonSchema } from '@/lib/academy/admin-content'
import { cuid } from '@/lib/academy/admin-course'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type LessonsRouteContext = {
  params: Promise<{ moduleId: string }>
}

export async function POST(request: NextRequest, { params }: LessonsRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { moduleId } = await params
    const body = createLessonSchema.parse(await request.json())
    const parentModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true },
    })

    if (!parentModule) {
      return NextResponse.json({ error: 'El módulo indicado no existe' }, { status: 400 })
    }

    const duplicate = await prisma.lesson.findFirst({
      where: { moduleId, slug: body.slug },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: 'Ya existe una lección con ese slug en este módulo' },
        { status: 400 }
      )
    }

    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const lesson = await prisma.lesson.create({
      data: {
        id: cuid(),
        moduleId,
        title: body.title,
        slug: body.slug,
        summary: body.summary || null,
        contentMDX: body.contentMDX || null,
        duration: body.duration,
        order: body.order ?? (lastLesson?.order ?? -1) + 1,
        isPublished: body.isPublished ?? false,
        isFreePreview: body.isFreePreview ?? false,
        videoUrl: body.videoUrl || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Datos de la lección inválidos', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    console.error('Error creating lesson:', error)
    return NextResponse.json({ error: 'No se pudo crear la lección' }, { status: 500 })
  }
}
