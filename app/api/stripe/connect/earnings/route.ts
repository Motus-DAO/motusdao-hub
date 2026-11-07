import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { assertAuthenticatedUser } from '@/lib/auth/guards'

/**
 * Card earnings for a therapist. Stripe-hosted dashboards are disabled for
 * connected accounts (`dashboard: 'none'`), so this is the only place where
 * they can see what they have earned.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireSession(request)
    const userId = assertAuthenticatedUser(actor)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (user?.role !== 'psm') {
      return NextResponse.json({ error: 'Solo un profesional puede ver sus ingresos.' }, { status: 403 })
    }

    const holds = await prisma.therapyCheckoutHold.findMany({
      where: { psmId: userId, status: 'paid', sessionId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const sessionIds = holds
      .map((hold) => hold.sessionId)
      .filter((id): id is string => Boolean(id))
    const sessions = sessionIds.length
      ? await prisma.session.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, scheduledStart: true, refundedAt: true },
        })
      : []
    const sessionById = new Map(sessions.map((session) => [session.id, session]))

    // A hold stays `paid` after a cancellation refund; the session carries the
    // `refundedAt` marker, so refunded sessions are excluded from earnings.
    const paid = holds
      .map((hold) => ({
        hold,
        session: hold.sessionId ? sessionById.get(hold.sessionId) : undefined,
      }))
      .filter(({ session }) => session && !session.refundedAt)

    const totals = paid.reduce(
      (acc, { hold }) => {
        acc.grossCents += hold.amountCents
        acc.feeCents += hold.feeCents
        acc.netCents += hold.amountCents - hold.feeCents
        return acc
      },
      { grossCents: 0, feeCents: 0, netCents: 0 }
    )

    return NextResponse.json({
      currency: 'usd',
      paidSessions: paid.length,
      ...totals,
      recent: paid.slice(0, 8).map(({ hold, session }) => ({
        id: hold.id,
        scheduledStart: session?.scheduledStart?.toISOString() ?? hold.createdAt.toISOString(),
        grossCents: hold.amountCents,
        feeCents: hold.feeCents,
        netCents: hold.amountCents - hold.feeCents,
      })),
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('[stripe-connect] earnings failed', error)
    return NextResponse.json({ error: 'No pudimos leer tus ingresos.' }, { status: 500 })
  }
}
