import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { getSubscriptionCurrentPeriodEnd } from '@/lib/academy/stripe-api-helpers'
import { prisma } from '@/lib/prisma'
import { getStripeClient } from '@/lib/stripe'

const cancelSchema = z.object({
  userId: z.string().min(1),
  enrollmentId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = cancelSchema.parse(await request.json())
    await requireSelfOrAdmin(request, body.userId)

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: body.enrollmentId },
      include: {
        course: {
          select: { id: true, billingInterval: true, title: true },
        },
      },
    })

    if (!enrollment || enrollment.userId !== body.userId) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
    }

    if (enrollment.course.billingInterval !== 'monthly') {
      return NextResponse.json({ error: 'Este curso no es de membresía mensual' }, { status: 400 })
    }

    if (!enrollment.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No hay suscripción de Stripe asociada' }, { status: 400 })
    }

    const stripe = getStripeClient()
    const subscription = await stripe.subscriptions.update(enrollment.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    const accessExpiresAt = getSubscriptionCurrentPeriodEnd(subscription)
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        accessExpiresAt,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'La membresía se cancelará al final del periodo actual.',
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      accessExpiresAt,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Solicitud inválida', details: error.errors }, { status: 400 })
    }

    console.error('Error canceling Stripe subscription:', error)
    return NextResponse.json({ error: 'No se pudo cancelar la suscripción' }, { status: 500 })
  }
}
