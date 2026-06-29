import { prisma } from '@/lib/prisma'
import { toInputJson } from '@/lib/prisma-json'

type FulfillStripeCourseParams = {
  orderId: string
  userId: string
  courseId: string
  amount: number
  currency: string
  stripeSessionId: string
  stripePaymentIntentId?: string | null
}

export async function fulfillStripeCourseCheckout(params: FulfillStripeCourseParams) {
  const {
    orderId,
    userId,
    courseId,
    amount,
    currency,
    stripeSessionId,
    stripePaymentIntentId,
  } = params

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    })

    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    if (order.userId !== userId) {
      throw new Error('Order user mismatch')
    }

    const courseItem = order.items.find((item) => item.courseId === courseId && item.type === 'course')
    if (!courseItem) {
      throw new Error('Course order item not found')
    }

    if (order.status === 'paid') {
      const existingEnrollment = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      })
      return { order, enrollment: existingEnrollment, alreadyFulfilled: true }
    }

    const payment = await tx.payment.create({
      data: {
        orderId,
        userId,
        amount,
        currency: currency.toUpperCase(),
        destination: 'dao_treasury',
        destinationAddress: 'stripe',
        provider: 'stripe',
        status: 'confirmed',
        confirmedAt: new Date(),
        transactionHash: stripePaymentIntentId ?? stripeSessionId,
        metadata: toInputJson({
          stripeSessionId,
          stripePaymentIntentId,
        }),
      },
    })

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        completedAt: new Date(),
        metadata: toInputJson({
          ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}),
          stripeSessionId,
          stripePaymentIntentId,
        }),
      },
    })

    const enrollment = await tx.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        purchasedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        userId,
        courseId,
        progress: 0,
        completed: false,
        purchasedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    await tx.orderItem.update({
      where: { id: courseItem.id },
      data: { enrollmentId: enrollment.id },
    })

    return { order, enrollment, payment, alreadyFulfilled: false }
  })
}
