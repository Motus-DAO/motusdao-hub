import 'dotenv/config'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET in environment')
    }

    const course = await prisma.course.findFirst({
      where: { isPublished: true, isFree: false },
      select: { id: true, title: true, priceAmount: true, priceCurrency: true },
    })
    if (!course) throw new Error('No published paid course found')

    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        role: 'usuario',
        enrollments: { none: { courseId: course.id } },
      },
      select: { id: true, email: true },
    })
    if (!user) {
      throw new Error('No eligible user without enrollment found for paid course')
    }

    const amount = Number(course.priceAmount ?? 0)
    if (!amount || Number.isNaN(amount)) {
      throw new Error('Course has invalid priceAmount')
    }

    const now = Date.now()
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        currency: course.priceCurrency || 'MXN',
        subtotalAmount: amount,
        totalAmount: amount,
        notes: 'Webhook reliability test order',
        metadata: {
          courseId: course.id,
          provider: 'stripe-test-webhook',
          reliabilityTest: true,
        },
        items: {
          create: {
            type: 'course',
            description: course.title,
            quantity: 1,
            unitAmount: amount,
            totalAmount: amount,
            currency: course.priceCurrency || 'MXN',
            courseId: course.id,
          },
        },
      },
      select: { id: true },
    })

    const sessionId = `cs_test_reliability_${now}`
    const paymentIntentId = `pi_test_reliability_${now}`
    const eventId = `evt_test_reliability_${now}`

    const event: Stripe.Event = {
      id: eventId,
      object: 'event',
      api_version: '2020-08-27',
      created: Math.floor(now / 1000),
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          payment_status: 'paid',
          amount_total: Math.round(amount * 100),
          currency: (course.priceCurrency || 'MXN').toLowerCase(),
          payment_intent: paymentIntentId,
          metadata: {
            orderId: order.id,
            userId: user.id,
            courseId: course.id,
          },
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: 'checkout.session.completed',
    } as unknown as Stripe.Event

    const payload = JSON.stringify(event)
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    })

    const first = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
    })
    const firstBody = await first.text()

    const replay = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
    })
    const replayBody = await replay.text()

    const orderAfter = await prisma.order.findUnique({
      where: { id: order.id },
      select: {
        status: true,
        payments: {
          select: {
            id: true,
            transactionHash: true,
            status: true,
          },
        },
        items: {
          select: {
            enrollmentId: true,
          },
        },
      },
    })

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, courseId: course.id },
      select: { id: true },
    })

    console.log(
      JSON.stringify(
        {
          webhookEventId: eventId,
          sessionId,
          orderId: order.id,
          userId: user.id,
          courseId: course.id,
          firstCall: { status: first.status, body: firstBody },
          replayCall: { status: replay.status, body: replayBody },
          final: {
            orderStatus: orderAfter?.status,
            paymentCount: orderAfter?.payments.length ?? 0,
            paymentHashes: orderAfter?.payments.map((payment) => payment.transactionHash),
            orderItemEnrollmentIds: orderAfter?.items.map((item) => item.enrollmentId),
            enrollmentCount: enrollments.length,
            enrollmentIds: enrollments.map((enrollment) => enrollment.id),
          },
        },
        null,
        2
      )
    )
  } finally {
    await prisma.$disconnect()
  }
}

void main()
