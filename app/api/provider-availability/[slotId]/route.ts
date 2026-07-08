import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'

type RouteParams = { params: Promise<{ slotId: string }> }

/**
 * DELETE /api/provider-availability/[slotId]
 * Remove a future availability slot owned by the authenticated PSM.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slotId } = await params

    const slot = await prisma.providerAvailabilitySlot.findUnique({
      where: { id: slotId },
      select: { id: true, psmId: true, startsAt: true },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Horario no encontrado' }, { status: 404 })
    }

    await requireSelfOrAdmin(request, slot.psmId)

    if (slot.startsAt <= new Date()) {
      return NextResponse.json(
        { error: 'No se pueden eliminar horarios que ya comenzaron' },
        { status: 400 }
      )
    }

    await prisma.providerAvailabilitySlot.delete({ where: { id: slotId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error deleting availability slot:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
