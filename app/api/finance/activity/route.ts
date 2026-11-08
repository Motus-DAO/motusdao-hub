import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { formatUnits, type Address } from 'viem'
import { fetchBlockscoutHistory } from '@/lib/onchain/history'
import { listEscrowSessionsForAddress } from '@/lib/escrow/list'
import { mergeActivity } from '@/lib/finance/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/activity
 *
 * Read model for the finance hub: on-chain movements (Blockscout) + therapy
 * payments (card/SPEI) + Academy purchases. No writes, no schema.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request)
    const userId = auth.userId

    const onchain = auth.eoaAddress
      ? await fetchBlockscoutHistory(auth.eoaAddress).catch((error) => {
          console.error('[finance/activity] onchain:', error)
          return []
        })
      : []

    const escrowSessions = auth.eoaAddress
      ? await listEscrowSessionsForAddress(auth.eoaAddress as Address).catch((error) => {
          console.error('[finance/activity] escrow:', error)
          return []
        })
      : []

    const sessions = userId
      ? await prisma.session.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            paidAt: true,
            refundedAt: true,
            psm: { select: { motusName: true, email: true } },
          },
        })
      : []

    const sessionIds = sessions.map((session) => session.id)

    const holds =
      sessionIds.length > 0
        ? await prisma.therapyCheckoutHold.findMany({
            where: { sessionId: { in: sessionIds } },
            select: { sessionId: true, amountCents: true },
          })
        : []

    const transfers =
      sessionIds.length > 0
        ? await prisma.sessionTransferEvent.findMany({
            where: { sessionId: { in: sessionIds }, kind: 'psm_confirmed' },
            select: { sessionId: true, amount: true, currency: true, createdAt: true },
          })
        : []

    const payments = userId
      ? await prisma.payment.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
            orderId: true,
          },
        })
      : []

    const holdBySession = new Map<string, number>()
    for (const hold of holds) {
      if (hold.sessionId) holdBySession.set(hold.sessionId, hold.amountCents)
    }

    const items = mergeActivity({
      onchain,
      card: sessions
        .filter((session) => session.paidAt)
        .map((session) => ({
          sessionId: session.id,
          paidAt: session.paidAt,
          refundedAt: session.refundedAt,
          amountCents: holdBySession.get(session.id) ?? null,
          psmLabel: session.psm?.motusName || session.psm?.email || null,
        })),
      spei: transfers.map((transfer) => ({
        sessionId: transfer.sessionId,
        amount: transfer.amount ? transfer.amount.toString() : null,
        currency: transfer.currency,
        createdAt: transfer.createdAt,
      })),
      escrow: escrowSessions.map((escrow) => {
        const amount = BigInt(escrow.amount)
        const payout = (amount * BigInt(9000)) / BigInt(10000)
        return {
          id: escrow.id,
          role: escrow.role,
          amount: formatUnits(amount, 18),
          payout: formatUnits(payout, 18),
          startsAt: escrow.startsAt,
          status: escrow.status,
        }
      }),
      academy: payments.map((payment) => ({
        paymentId: payment.id,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        orderId: payment.orderId,
      })),
    })

    return NextResponse.json({
      items,
      sources: {
        onchain: onchain.length,
        therapy:
          sessions.filter((session) => session.paidAt).length +
          transfers.length +
          escrowSessions.length,
        academy: payments.length,
      },
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('[finance/activity]', error)
    return NextResponse.json(
      { error: 'No se pudo cargar la actividad. Intenta de nuevo en un momento.' },
      { status: 502 }
    )
  }
}
