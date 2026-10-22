import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAiCreditPack } from '@/lib/ai-credit'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { getStripeClient, isStripeConfigured, toStripeUnitAmount } from '@/lib/stripe'
import { SITE_URL } from '@/lib/constants'

const checkoutSchema = z.object({
  amountUsd: z.number(),
})

function returnBase(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      return new URL(origin).origin
    } catch {
      // fall through
    }
  }
  return SITE_URL.replace(/\/$/, '')
}

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe no está configurado. Agrega STRIPE_SECRET_KEY en .env.local.' },
        { status: 503 }
      )
    }

    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const body = checkoutSchema.parse(await request.json())
    if (!isAiCreditPack(body.amountUsd)) {
      return NextResponse.json({ error: 'El paquete tiene que ser de 5 o 10 USD.' }, { status: 400 })
    }

    const stripe = getStripeClient()
    const base = returnBase(request)
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${base}/psychat?credit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/psychat?credit=cancelled`,
      client_reference_id: session.userId,
      metadata: {
        kind: 'ai_credit',
        userId: session.userId,
        amountUsd: String(body.amountUsd),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: toStripeUnitAmount(body.amountUsd, 'usd'),
            product_data: {
              name: `Crédito Psychat ${body.amountUsd} USD`,
              description: 'Saldo de inferencia para Psychat. Se suma a tu cuenta. No abre una clave distinta.',
            },
          },
        },
      ],
    })

    if (!checkout.url) {
      return NextResponse.json({ error: 'No se pudo crear el pago.' }, { status: 500 })
    }

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'El paquete tiene que ser de 5 o 10 USD.' }, { status: 400 })
    }
    throw error
  }
}
