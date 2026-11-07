import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { getStripeConnectClient, isStripeConnectConfigured } from '@/lib/stripe'
import { connectAccountSessionComponents } from '@/lib/stripe-connect'
import { isValidStripeAccountId } from '@/lib/stripe-connect-paths'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AccountSessionBody = {
  accountId?: unknown
}

/**
 * Short-lived client secret for Connect embedded components.
 *
 * The connected account is never taken at face value: it must match the
 * `stripeConnectedAccountId` stored on the authenticated therapist's profile.
 * That check is what makes the `stripe_account_id` links Stripe emails safe.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeConnectConfigured()) {
      return NextResponse.json(
        { error: 'Stripe Connect no está configurado.' },
        { status: 503 }
      )
    }

    const actor = await requireSession(request)
    const userId = assertAuthenticatedUser(actor)

    const body = (await request.json().catch(() => null)) as AccountSessionBody | null
    const requestedAccountId =
      (typeof body?.accountId === 'string' ? body.accountId : null) ??
      request.nextUrl.searchParams.get('stripe_account_id')

    if (requestedAccountId && !isValidStripeAccountId(requestedAccountId)) {
      return NextResponse.json({ error: 'Cuenta de Stripe inválida.' }, { status: 400 })
    }

    const psm = await prisma.pSMProfile.findUnique({
      where: { userId },
      select: { stripeConnectedAccountId: true },
    })

    const accountId = psm?.stripeConnectedAccountId
    if (!accountId) {
      return NextResponse.json(
        { error: 'Todavía no tienes una cuenta de Stripe conectada.' },
        { status: 409 }
      )
    }

    if (requestedAccountId && requestedAccountId !== accountId) {
      return NextResponse.json(
        { error: 'Esa cuenta de Stripe no pertenece a tu usuario.' },
        { status: 403 }
      )
    }

    const accountSession = await getStripeConnectClient().accountSessions.create({
      account: accountId,
      components: connectAccountSessionComponents(),
    })

    return NextResponse.json(
      {
        clientSecret: accountSession.client_secret,
        accountId: accountSession.account,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('[stripe-connect] account session failed', error)

    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('site links') || message.includes('site_links')) {
      return NextResponse.json(
        {
          error:
            'Stripe todavía no permite abrir sesiones en vivo. Configura los Site links en Dashboard → Settings → Connect → Site links.',
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'No pudimos abrir el panel de Stripe. Intenta de nuevo.' },
      { status: 502 }
    )
  }
}
