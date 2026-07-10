import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireAdmin } from '@/lib/auth/session'
import { seedAvailabilityForPsm } from '@/lib/psm/seed-availability'

type RouteParams = { params: Promise<{ psmId: string }> }

/**
 * POST /api/admin/psm/[psmId]/availability/seed
 * Creates demo availability slots for a PSM (admin only, idempotent).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { psmId } = await params

    const psm = await prisma.user.findUnique({
      where: { id: psmId },
      select: { role: true },
    })

    if (!psm || psm.role !== 'psm') {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const result = await seedAvailabilityForPsm(psmId)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error seeding PSM availability:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
