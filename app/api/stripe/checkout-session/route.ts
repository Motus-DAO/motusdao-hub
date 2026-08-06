import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { getRequestOrigin, handleAuthError } from '@/lib/auth/session'
import { courseRequiresPayment, normalizeCourseCurrency, resolveCheckoutCharge } from '@/lib/academy/course-pricing'
import { hasActiveEnrollmentAccess, isMonthlyCourse, normalizeBillingInterval } from '@/lib/academy/enrollment-access'
import { getUsdToMxnRate } from '@/lib/academy/fx'
import { SITE_URL } from '@/lib/constants'
import { getStripeClient, isStripeConfigured, toStripeUnitAmount } from '@/lib/stripe'
import { toInputJson } from '@/lib/prisma-json'

const checkoutSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  currency: z.enum(['MXN', 'USD']).optional(),
})

/** Prefer the browser origin so localhost checkout returns to localhost, not prod. */
function checkoutReturnBase(request: NextRequest): string {
  const originHeader = request.headers.get('origin')
  if (originHeader) {
    try {
      return new URL(originHeader).origin
    } catch {
      // fall through
    }
  }

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin
    } catch {
      // fall through
    }
  }

  return getRequestOrigin(request) || SITE_URL.replace(/\/$/, '')
}

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

    if (existingEnrollment && hasActiveEnrollmentAccess(existingEnrollment, course)) {
      return NextResponse.json({ error: 'Ya estás inscrito en este curso' }, { status: 409 })
    }

    const billingInterval = normalizeBillingInterval(course.billingInterval)
    const isSubscription = isMonthlyCourse(course)

    const payCurrency = normalizeCourseCurrency(body.currency || course.priceCurrency)
    const fx = await getUsdToMxnRate()
    const charge = resolveCheckoutCharge(course, payCurrency, fx)
    const unitAmount = charge.amount
    const priceCurrency = charge.currency
    const currency = priceCurrency.toLowerCase()
    const stripeAmount = toStripeUnitAmount(unitAmount, currency)

    if (!(unitAmount > 0) || !(stripeAmount > 0)) {
      return NextResponse.json({ error: 'El monto convertido no es válido' }, { status: 400 })
    }

    const order = await prisma.order.create({
      data: {
        userId: body.userId,
        currency: priceCurrency,
        subtotalAmount: unitAmount,
        totalAmount: unitAmount,
        notes: `Academy course: ${course.title}`,
        metadata: toInputJson({
          courseId: course.id,
          courseSlug: course.slug,
          provider: 'stripe',
          priceCurrency,
          billingInterval,
          baseCurrency: normalizeCourseCurrency(course.priceCurrency),
          baseAmount: Number(course.priceAmount),
          fxUsdMxn: fx.rate,
          fxSource: fx.source,
          fxDate: fx.date,
        }),
        items: {
          create: {
            type: 'course',
            description: course.title,
            quantity: 1,
            unitAmount,
            totalAmount: unitAmount,
            currency: priceCurrency,
            courseId: course.id,
          },
        },
      },
      include: { items: true },
    })

    const stripe = getStripeClient()
    const returnBase = checkoutReturnBase(request)
    const successUrl = `${returnBase}/academia/${course.slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${returnBase}/academia/${course.slug}?checkout=cancelled`

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        userId: body.userId,
        courseId: course.id,
        priceCurrency,
        billingInterval,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: stripeAmount,
            ...(isSubscription
              ? {
                  recurring: { interval: 'month' as const },
                }
              : {}),
            product_data: {
              name: course.title,
              description: isSubscription
                ? `${course.summary.slice(0, 480)} (membresía mensual)`
                : course.summary.slice(0, 500),
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
          priceCurrency,
          billingInterval,
          baseCurrency: normalizeCourseCurrency(course.priceCurrency),
          baseAmount: Number(course.priceAmount),
          fxUsdMxn: fx.rate,
          fxSource: fx.source,
          fxDate: fx.date,
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
