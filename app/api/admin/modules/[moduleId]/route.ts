import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateModuleSchema } from '@/lib/academy/admin-content'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type ModuleRouteContext = {
  params: Promise<{ moduleId: string }>
}

export async function PATCH(request: NextRequest, { params }: ModuleRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { moduleId } = await params
    const body = updateModuleSchema.parse(await request.json())
    const updatedModule = await prisma.module.update({
      where: { id: moduleId },
      data: {
        ...body,
        summary: body.summary === '' ? null : body.summary,
        updatedAt: new Date(),
      },
      include: {
        lessons: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    return NextResponse.json({ module: updatedModule })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Datos del módulo inválidos', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
    }

    console.error('Error updating module:', error)
    return NextResponse.json({ error: 'No se pudo actualizar el módulo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: ModuleRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { moduleId } = await params
    await prisma.module.delete({ where: { id: moduleId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
    }

    console.error('Error deleting module:', error)
    return NextResponse.json({ error: 'No se pudo eliminar el módulo' }, { status: 500 })
  }
}
