import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SessionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  slots: z
    .array(
      z.object({
        startsAt: z.string().min(1),
        endsAt: z.string().min(1),
      })
    )
    .min(1)
    .max(500),
  timezone: z.string().max(64).optional(),
})

const BOOKED: SessionStatus[] = ['requested', 'accepted', 'completed']

/**
 * POST /api/provider-availability/bulk
 * Materializes the slots drawn in the weekly calendar. The session decides the
 * professional; the client never sends psmId. Skips duplicates and booked
 * conflicts.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    })
    if (!user || user.role !== 'psm') {
      return NextResponse.json(
        { error: 'Solo un profesional puede publicar horarios.' },
        { status: 403 }
      )
    }

    const body = bodySchema.parse(await request.json())
    const now = Date.now()

    const candidates: { startsAt: Date; endsAt: Date }[] = []
    const seen = new Set<string>()
    for (const slot of body.slots) {
      const startsAt = new Date(slot.startsAt)
      const endsAt = new Date(slot.endsAt)
      if (
        Number.isNaN(startsAt.getTime()) ||
        Number.isNaN(endsAt.getTime()) ||
        startsAt.getTime() <= now ||
        endsAt.getTime() <= startsAt.getTime()
      ) {
        continue
      }
      const minutes = (endsAt.getTime() - startsAt.getTime()) / 60000
      if (minutes < 15 || minutes > 180) continue
      const key = startsAt.toISOString()
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push({ startsAt, endsAt })
    }

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No hay horarios futuros válidos.' }, { status: 400 })
    }

    const existing = await prisma.providerAvailabilitySlot.findMany({
      where: {
        psmId: session.userId,
        startsAt: { in: candidates.map((slot) => slot.startsAt) },
      },
      select: { startsAt: true },
    })
    const existingKeys = new Set(existing.map((slot) => slot.startsAt.toISOString()))

    const booked = await prisma.session.findMany({
      where: {
        psmId: session.userId,
        status: { in: BOOKED },
        scheduledStart: { not: null },
        scheduledEnd: { not: null },
      },
      select: { scheduledStart: true, scheduledEnd: true },
    })

    const free = candidates.filter((slot) => {
      if (existingKeys.has(slot.startsAt.toISOString())) return false
      return !booked.some(
        (session) =>
          session.scheduledStart &&
          session.scheduledEnd &&
          session.scheduledStart < slot.endsAt &&
          session.scheduledEnd > slot.startsAt
      )
    })

    if (free.length > 0) {
      await prisma.providerAvailabilitySlot.createMany({
        data: free.map((slot) => ({
          psmId: session.userId!,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          timezone: body.timezone ?? null,
          isRecurring: true,
          recurrenceRule: 'weekly',
        })),
      })
    }

    return NextResponse.json({
      success: true,
      created: free.length,
      skipped: candidates.length - free.length,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Horarios inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[provider-availability/bulk]', error)
    return NextResponse.json(
      { error: 'No se pudieron publicar los horarios.' },
      { status: 500 }
    )
  }
}
