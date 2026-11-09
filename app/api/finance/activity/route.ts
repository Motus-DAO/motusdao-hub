import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { getSessionRoleContext } from '@/lib/auth/role-guards'
import { formatUnits, type Address } from 'viem'
import { fetchBlockscoutHistory } from '@/lib/onchain/history'
import { listEscrowSessionsForAddress } from '@/lib/escrow/list'
import { THERAPY_ESCROW_ADDRESS } from '@/lib/escrow/abi'
import { mergeActivity } from '@/lib/finance/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function personName(input: {
  motusName?: string | null
  email?: string | null
  profile?: { nombre: string | null; apellido: string | null } | null
}) {
  const full = `${input.profile?.nombre ?? ''} ${input.profile?.apellido ?? ''}`.trim()
  return full || input.motusName || input.email || null
}

/**
 * GET /api/finance/activity
 *
 * Read model for the finance hub: on-chain movements (Blockscout) + therapy
 * payments (card/SPEI, patient and professional sides) + Academy purchases.
 * No writes, no schema.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request)
    const context = await getSessionRoleContext()
    if (!context) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const userId = context.userId
    const activeIsPsm = context.role === 'psm' || context.role === 'admin'

    const rawOnchain = auth.eoaAddress
      ? await fetchBlockscoutHistory(auth.eoaAddress).catch((error) => {
          console.error('[finance/activity] onchain:', error)
          return []
        })
      : []

    // Escrow deposits/payouts are shown in Terapia; keep the raw transfer out
    // of Wallet so the same movement is not listed twice.
    const escrowAddress = THERAPY_ESCROW_ADDRESS.toLowerCase()
    const onchain = rawOnchain.filter(
      (item) =>
        item.to?.toLowerCase() !== escrowAddress &&
        item.from?.toLowerCase() !== escrowAddress
    )

    const escrowSessions = auth.eoaAddress
      ? (await listEscrowSessionsForAddress(auth.eoaAddress as Address).catch((error) => {
          console.error('[finance/activity] escrow:', error)
          return []
        })).filter((escrow) =>
          activeIsPsm ? escrow.role === 'payee' : escrow.role === 'patient'
        )
      : []

    // Sessions where the user is the patient (money out).
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

    // Sessions where the user is the professional (money in).
    const psmSessions = activeIsPsm && userId
      ? await prisma.session.findMany({
          where: { psmId: userId, paidAt: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            paidAt: true,
            refundedAt: true,
            user: {
              select: {
                motusName: true,
                email: true,
                profile: { select: { nombre: true, apellido: true } },
              },
            },
          },
        })
      : []

    const sessionIds = [...new Set([...sessions, ...psmSessions].map((s) => s.id))]

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

    const directionBySession = new Map<string, 'in' | 'out'>()
    const counterpartBySession = new Map<string, string>()
    for (const session of sessions) {
      directionBySession.set(session.id, 'out')
      const name = personName(session.psm ?? {})
      if (name) counterpartBySession.set(session.id, name)
    }
    for (const session of psmSessions) {
      directionBySession.set(session.id, 'in')
      const name = personName(session.user ?? {})
      if (name) counterpartBySession.set(session.id, name)
    }

    const items = mergeActivity({
      onchain,
      card: [
        ...sessions
          .filter((session) => session.paidAt)
          .map((session) => ({
            sessionId: session.id,
            paidAt: session.paidAt,
            refundedAt: session.refundedAt,
            amountCents: holdBySession.get(session.id) ?? null,
            psmLabel: session.psm?.motusName || session.psm?.email || null,
            counterpartLabel: counterpartBySession.get(session.id) ?? null,
            direction: 'out' as const,
          })),
        ...psmSessions
          .filter((session) => session.paidAt)
          .map((session) => ({
            sessionId: session.id,
            paidAt: session.paidAt,
            refundedAt: session.refundedAt,
            amountCents: holdBySession.get(session.id) ?? null,
            counterpartLabel: counterpartBySession.get(session.id) ?? null,
            direction: 'in' as const,
          })),
      ],
      spei: transfers.map((transfer) => ({
        sessionId: transfer.sessionId,
        amount: transfer.amount ? transfer.amount.toString() : null,
        currency: transfer.currency,
        createdAt: transfer.createdAt,
        counterpartLabel: counterpartBySession.get(transfer.sessionId) ?? null,
        direction: directionBySession.get(transfer.sessionId) ?? 'out',
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
          psmSessions.filter((session) => session.paidAt).length +
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
