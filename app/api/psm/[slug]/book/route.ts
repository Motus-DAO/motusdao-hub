import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'
import { buildOfficeJitsiUrl } from '@/lib/jitsi'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'
import { findPublicPsmBySlug } from '@/lib/psm/lookup'
import { isSlotAvailable, slotDurationMinutes } from '@/lib/psm/availability'

const bookSchema = z.object({
  userId: z.string().min(1),
  slotId: z.string().min(1),
  durationMinutes: z.number().int().positive().optional(),
})

type RouteParams = { params: Promise<{ slug: string }> }

/**
 * POST /api/psm/[slug]/book
 * Marketplace booking: manual match + session request.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const body = bookSchema.parse(await request.json())
    const sessionActor = await requireSelfOrAdmin(request, body.userId)

    const psmUser = await findPublicPsmBySlug(slug)
    if (!psmUser?.psm) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const activeCount = psmUser.psmMatches.length
    const capacity = Math.max((psmUser.psm.maxActivePatients || 10) - activeCount, 0)
    if (capacity <= 0) {
      return NextResponse.json(
        { error: 'Este profesional no tiene cupos disponibles' },
        { status: 409 }
      )
    }

    const slot = await prisma.providerAvailabilitySlot.findFirst({
      where: {
        id: body.slotId,
        psmId: psmUser.id,
        isAvailable: true,
        startsAt: { gt: new Date() },
      },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Horario no disponible' }, { status: 404 })
    }

    const free = await isSlotAvailable(slot.id, psmUser.id)
    if (!free) {
      return NextResponse.json({ error: 'Ese horario ya fue reservado' }, { status: 409 })
    }

    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      include: {
        userMatches: { where: { status: 'active' } },
      },
    })

    if (!user || user.role !== 'usuario') {
      return NextResponse.json(
        { error: 'Solo los usuarios pueden agendar sesiones' },
        { status: 400 }
      )
    }

    const existingWithOtherPsm = user.userMatches.find((m) => m.psmId !== psmUser.id)
    if (existingWithOtherPsm) {
      return NextResponse.json(
        { error: 'Ya tienes un profesional activo. Finaliza ese proceso antes de agendar con otro.' },
        { status: 409 }
      )
    }

    let match = user.userMatches.find((m) => m.psmId === psmUser.id)

    if (!match) {
      match = await prisma.match.create({
        data: {
          userId: user.id,
          psmId: psmUser.id,
          status: 'active',
          source: 'manual',
          score: 1,
        },
      })
    }

    const durationMinutes =
      body.durationMinutes ?? slotDurationMinutes(slot)
    const scheduledStart = slot.startsAt
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000)

    const pendingSession = await prisma.session.findFirst({
      where: {
        userId: user.id,
        psmId: psmUser.id,
        status: { in: ['requested', 'accepted'] },
      },
    })

    if (pendingSession) {
      return NextResponse.json(
        {
          success: true,
          message: 'Ya tienes una sesión pendiente',
          sessionId: pendingSession.id,
          matchId: match.id,
          paymentRequired: true,
          amountUsd: PLATFORM_SESSION_PRICE_USD,
        },
        { status: 200 }
      )
    }

    const sessionId = randomUUID()
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        psmId: psmUser.id,
        matchId: match.id,
        status: 'requested',
        mode: 'video_external',
        externalUrl: buildOfficeJitsiUrl(match.id),
        scheduledStart,
        scheduledEnd,
        timezone: slot.timezone,
        durationMinutes,
      },
    })

    await recordClinicalAccess({
      request,
      actorUserId: sessionActor.userId,
      targetUserId: user.id,
      action: 'create',
      resource: 'session',
      resourceId: session.id,
      reason: 'marketplace_book',
      metadata: { psmId: psmUser.id, slotId: slot.id },
    })

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        matchId: match.id,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        durationMinutes,
        paymentRequired: true,
        amountUsd: PLATFORM_SESSION_PRICE_USD,
      },
      { status: 201 }
    )
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de reserva inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error booking session:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
