import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fulfillCourseFromStripeSession } from '@/lib/academy/stripe-session'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'

const confirmSchema = z.object({
  sessionId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 503 })
    }

    const body = confirmSchema.parse(await request.json())
    const auth = await requireSession(request)
    const userId = assertAuthenticatedUser(auth)

    const stripe = getStripeClient()
    const checkoutSession = await stripe.checkout.sessions.retrieve(body.sessionId)

    if (checkoutSession.metadata?.userId !== userId) {
      return NextResponse.json({ error: 'No autorizado para esta sesión de pago' }, { status: 403 })
    }

    const result = await fulfillCourseFromStripeSession(checkoutSession)

    return NextResponse.json({
      success: true,
      enrollment: result.enrollment,
      alreadyFulfilled: result.alreadyFulfilled ?? false,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Solicitud inválida', details: error.errors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    const status = message === 'Payment not completed' ? 402 : 500
    console.error('Error confirming Stripe checkout:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
