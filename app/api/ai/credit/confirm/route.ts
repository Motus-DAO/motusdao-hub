import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fulfillAiCreditPurchase } from '@/lib/ai-credit-purchase'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'

const confirmSchema = z.object({
  sessionId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe no está configurado.' }, { status: 503 })
    }

    const auth = await requireSession(request)
    if (!auth.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const body = confirmSchema.parse(await request.json())
    const checkoutSession = await getStripeClient().checkout.sessions.retrieve(body.sessionId)
    if (checkoutSession.metadata?.kind !== 'ai_credit' || checkoutSession.metadata.userId !== auth.userId) {
      return NextResponse.json({ error: 'No autorizado para este pago.' }, { status: 403 })
    }

    const result = await fulfillAiCreditPurchase(checkoutSession)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'No se pudo acreditar el pago.'
    const status = message === 'Payment not completed' ? 402 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
