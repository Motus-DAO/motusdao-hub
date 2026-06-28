import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'

const patchSchema = z.object({
  userId: z.string().min(1),
  progress: z.number().int().min(0).max(100),
  completed: z.boolean(),
})

type RouteParams = { params: Promise<{ enrollmentId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { enrollmentId } = await params
    const body = patchSchema.parse(await request.json())
    await requireSelfOrAdmin(request, body.userId)

    const existing = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
    }

    if (existing.userId !== body.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const enrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress: body.progress,
        completed: body.completed,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, enrollment })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating enrollment:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
