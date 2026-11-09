import { NextRequest, NextResponse } from 'next/server'
import type { Address } from 'viem'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { getActivePsmContext } from '@/lib/auth/role-guards'
import { listEscrowSessionsForPayee } from '@/lib/escrow/list'

/**
 * GET /api/psm/escrow-sessions
 * Escrow sessions where the signed-in user is the professional (payee).
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getActivePsmContext()
    if (!context) {
      return NextResponse.json({ error: 'Solo profesionales' }, { status: 403 })
    }
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { eoaAddress: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const sessions = await listEscrowSessionsForPayee(user.eoaAddress as Address)

    return NextResponse.json({
      sessions: sessions.map((item) => ({
        id: item.id,
        amount: item.amount.toString(),
        startsAt: item.startsAt,
        settledAt: item.settledAt,
        challengeWindow: item.challengeWindow,
        status: item.status,
        patient: item.patient,
        payee: item.payee,
      })),
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('Error listing escrow sessions:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar las sesiones.' },
      { status: 500 }
    )
  }
}
