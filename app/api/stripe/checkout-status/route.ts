import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'

const statusSchema = z.object({
  sessionId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 503 })
    }

    const sessionId = statusSchema.parse({
      sessionId: request.nextUrl.searchParams.get('sessionId'),
    }).sessionId

    const auth = await requireSession(request)
    const userId = assertAuthenticatedUser(auth)

    const stripe = getStripeClient()
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (checkoutSession.metadata?.userId !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const courseId = checkoutSession.metadata?.courseId
    const orderId = checkoutSession.metadata?.orderId

    let enrollment = null
    if (courseId) {
      enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: {
          id: true,
          userId: true,
          courseId: true,
          progress: true,
          completed: true,
        },
      })
    }

    let orderStatus: string | null = null
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      })
      orderStatus = order?.status ?? null
    }

    const paid =
      checkoutSession.payment_status === 'paid' || orderStatus === 'paid' || Boolean(enrollment)

    return NextResponse.json({
      sessionId,
      paymentStatus: checkoutSession.payment_status,
      orderStatus,
      paid,
      fulfilled: Boolean(enrollment),
      enrollment,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
    }

    console.error('Error reading Stripe checkout status:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
