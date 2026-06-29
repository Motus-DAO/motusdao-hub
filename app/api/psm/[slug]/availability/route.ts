import { NextRequest, NextResponse } from 'next/server'
import { findPsmUserIdBySlug } from '@/lib/psm/lookup'
import { getAvailableSlotsForPsm, slotDurationMinutes } from '@/lib/psm/availability'

type RouteParams = { params: Promise<{ slug: string }> }

/**
 * GET /api/psm/[slug]/availability
 * Public read of open booking slots (next 14 days).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const psmId = await findPsmUserIdBySlug(slug)

    if (!psmId) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const slots = await getAvailableSlotsForPsm(psmId)

    return NextResponse.json({
      success: true,
      timezoneLabel: 'En tu zona horaria',
      slots: slots.map((slot) => ({
        id: slot.id,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        timezone: slot.timezone,
        durationMinutes: slotDurationMinutes(slot),
      })),
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
