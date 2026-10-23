import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { assertAuthenticatedUser, isAdmin } from '@/lib/auth/guards'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'
import { fulfillTherapyCheckout } from '@/lib/stripe-therapy'

const confirmSchema = z.object({
  checkoutSessionId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe no está configurado.' }, { status: 503 })
    }

    const actor = await requireSession(request)
    const actorId = assertAuthenticatedUser(actor)
    const body = confirmSchema.parse(await request.json())
    const hold = await prisma.therapyCheckoutHold.findUnique({
      where: { stripeCheckoutSessionId: body.checkoutSessionId },
    })
    if (!hold) {
      return NextResponse.json({ error: 'No encontramos ese pago.' }, { status: 404 })
    }
    if (!isAdmin(actor) && actorId !== hold.userId) {
      return NextResponse.json({ error: 'Ese pago no es tuyo.' }, { status: 403 })
    }

    const checkout = await getStripeClient().checkout.sessions.retrieve(
      body.checkoutSessionId,
      {},
      { stripeAccount: hold.stripeConnectedAccountId }
    )
    const result = await fulfillTherapyCheckout(checkout, request)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json({ success: true, sessionId: result.sessionId })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Falta el pago a confirmar.' }, { status: 400 })
    }
    console.error('[therapy-checkout] confirm failed', error)
    return NextResponse.json({ error: 'No pudimos confirmar el pago.' }, { status: 500 })
  }
}
