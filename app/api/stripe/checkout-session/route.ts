import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { coursePriceAmount, courseRequiresPayment } from '@/lib/academy/course-pricing'
import { SITE_URL } from '@/lib/constants'
import { getStripeClient, isStripeConfigured, toStripeUnitAmount } from '@/lib/stripe'
import { toInputJson } from '@/lib/prisma-json'

const checkoutSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe no está configurado. Agrega STRIPE_SECRET_KEY en .env.local.' },
        { status: 503 }
      )
    }

    const body = checkoutSchema.parse(await request.json())
    await requireSelfOrAdmin(request, body.userId)

    const course = await prisma.course.findFirst({
      where: { id: body.courseId, isPublished: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    if (!courseRequiresPayment(course)) {
      return NextResponse.json(
        { error: 'Este curso es gratuito. Usa inscripción directa.' },
        { status: 400 }
      )
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: body.userId,
          courseId: course.id,
        },
      },
    })

    if (existingEnrollment) {
      return NextResponse.json({ error: 'Ya estás inscrito en este curso' }, { status: 409 })
    }

    const unitAmount = coursePriceAmount(course)
    const currency = (course.priceCurrency || 'MXN').toLowerCase()
    const stripeAmount = toStripeUnitAmount(unitAmount, currency)

    const order = await prisma.order.create({
      data: {
        userId: body.userId,
        currency: course.priceCurrency || 'MXN',
        subtotalAmount: unitAmount,
        totalAmount: unitAmount,
        notes: `Academy course: ${course.title}`,
        metadata: toInputJson({
          courseId: course.id,
          courseSlug: course.slug,
          provider: 'stripe',
        }),
        items: {
          create: {
            type: 'course',
            description: course.title,
            quantity: 1,
            unitAmount,
            totalAmount: unitAmount,
            currency: course.priceCurrency || 'MXN',
            courseId: course.id,
          },
        },
      },
      include: { items: true },
    })

    const stripe = getStripeClient()
    const successUrl = `${SITE_URL}/academia/${course.slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${SITE_URL}/academia/${course.slug}?checkout=cancelled`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        userId: body.userId,
        courseId: course.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: stripeAmount,
            product_data: {
              name: course.title,
              description: course.summary.slice(0, 500),
            },
          },
        },
      ],
    })

    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: toInputJson({
          courseId: course.id,
          courseSlug: course.slug,
          provider: 'stripe',
          stripeSessionId: session.id,
        }),
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'No se pudo crear la sesión de pago' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      sessionId: session.id,
      url: session.url,
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

    console.error('Error creating Stripe checkout session:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
