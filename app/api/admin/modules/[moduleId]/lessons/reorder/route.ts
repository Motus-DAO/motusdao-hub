import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { reorderLessonsSchema } from '@/lib/academy/admin-content'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type ReorderLessonsContext = {
  params: Promise<{ moduleId: string }>
}

export async function PATCH(request: NextRequest, { params }: ReorderLessonsContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { moduleId } = await params
    const { lessonIds } = reorderLessonsSchema.parse(await request.json())
    const parentModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true },
    })
    if (!parentModule) {
      return NextResponse.json({ error: 'El módulo indicado no existe' }, { status: 400 })
    }

    const current = await prisma.lesson.findMany({
      where: { moduleId },
      select: { id: true },
    })
    const currentIds = new Set(current.map((lesson) => lesson.id))
    if (current.length !== lessonIds.length || lessonIds.some((id) => !currentIds.has(id))) {
      return NextResponse.json(
        { error: 'La lista debe incluir todas las lecciones del módulo una sola vez' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      lessonIds.map((id, order) =>
        prisma.lesson.update({
          where: { id },
          data: { order, updatedAt: new Date() },
        })
      )
    )
    const lessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ lessons })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Orden de lecciones inválido' },
        { status: 400 }
      )
    }

    console.error('Error reordering lessons:', error)
    return NextResponse.json({ error: 'No se pudieron reordenar las lecciones' }, { status: 500 })
  }
}
