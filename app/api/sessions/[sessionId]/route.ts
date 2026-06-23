import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertAuthenticatedUser, isAdmin } from '@/lib/auth/guards'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { AuthError } from '@/lib/auth/errors'
import { recordClinicalAccess } from '@/lib/clinical-audit'

const updateSchema = z.object({
  action: z.enum(['accept', 'complete', 'cancel', 'reschedule']),
  cancelReason: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  timezone: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionActor = await requireSession(request)
    const actorId = assertAuthenticatedUser(sessionActor)
    const { sessionId } = await params
    const body = updateSchema.parse(await request.json())

    const therapySession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, psmId: true, status: true },
    })

    if (!therapySession) {
      throw new AuthError(404, 'Sesión no encontrada')
    }

    if (!isAdmin(sessionActor) && actorId !== therapySession.userId && actorId !== therapySession.psmId) {
      throw new AuthError(403, 'Not authorized for this session')
    }

    const now = new Date()
    const data =
      body.action === 'accept'
        ? { status: 'accepted' as const, acceptedAt: now }
        : body.action === 'complete'
          ? { status: 'completed' as const, completedAt: now }
          : body.action === 'cancel'
            ? {
                status: 'cancelled' as const,
                cancelledAt: now,
                cancelReason: body.cancelReason || 'Cancelada por participante',
              }
            : {
                scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
                scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
                timezone: body.timezone,
                durationMinutes: body.durationMinutes,
              }

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data,
      include: {
        user: { include: { profile: true } },
        psm: { include: { profile: true } },
        match: true,
      },
    })

    await recordClinicalAccess({
      request,
      actorUserId: actorId,
      targetUserId: updatedSession.userId,
      action: 'update',
      resource: 'session',
      resourceId: updatedSession.id,
      reason: `session_${body.action}`,
      metadata: { psmId: updatedSession.psmId },
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de sesión inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
