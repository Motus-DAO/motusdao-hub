import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { reorderModulesSchema } from '@/lib/academy/admin-content'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type ReorderModulesContext = {
  params: Promise<{ courseId: string }>
}

export async function PATCH(request: NextRequest, { params }: ReorderModulesContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { courseId } = await params
    const { moduleIds } = reorderModulesSchema.parse(await request.json())
    const current = await prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    })
    const currentIds = new Set(current.map((module) => module.id))

    if (current.length !== moduleIds.length || moduleIds.some((id) => !currentIds.has(id))) {
      return NextResponse.json(
        { error: 'La lista debe incluir todos los módulos del curso una sola vez' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      moduleIds.map((id, order) =>
        prisma.module.update({
          where: { id },
          data: { order, updatedAt: new Date() },
        })
      )
    )
    const modules = await prisma.module.findMany({
      where: { courseId },
      include: {
        lessons: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ modules })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Orden de módulos inválido' },
        { status: 400 }
      )
    }

    console.error('Error reordering modules:', error)
    return NextResponse.json({ error: 'No se pudieron reordenar los módulos' }, { status: 500 })
  }
}
