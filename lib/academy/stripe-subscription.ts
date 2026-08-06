import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import {
  getInvoicePaymentIntentId,
  getInvoiceSubscriptionId,
  getSubscriptionCurrentPeriodEnd,
  getSubscriptionEndedAt,
} from '@/lib/academy/stripe-api-helpers'
import { getStripeClient } from '@/lib/stripe'
import { toInputJson } from '@/lib/prisma-json'

function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  return getSubscriptionCurrentPeriodEnd(subscription)
}

export async function extendEnrollmentFromSubscription(subscription: Stripe.Subscription) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!enrollment) {
    console.warn('No enrollment found for Stripe subscription', subscription.id)
    return null
  }

  const accessExpiresAt = subscriptionPeriodEnd(subscription)

  return prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      purchasedAt: new Date(),
      accessExpiresAt,
      updatedAt: new Date(),
    },
  })
}

export async function revokeEnrollmentFromSubscription(subscription: Stripe.Subscription) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!enrollment) return null

  const endedAt = getSubscriptionEndedAt(subscription)

  return prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      accessExpiresAt: endedAt < new Date() ? endedAt : new Date(),
      updatedAt: new Date(),
    },
  })
}

export async function handleStripeInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)

  if (!subscriptionId) return null

  const stripe = getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return extendEnrollmentFromSubscription(subscription)
  }

  return null
}

export async function handleStripeSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return extendEnrollmentFromSubscription(subscription)
  }

  if (
    subscription.status === 'canceled' ||
    subscription.status === 'unpaid' ||
    subscription.status === 'past_due' ||
    subscription.status === 'incomplete_expired'
  ) {
    return revokeEnrollmentFromSubscription(subscription)
  }

  return null
}

export async function handleStripeSubscriptionDeleted(subscription: Stripe.Subscription) {
  return revokeEnrollmentFromSubscription(subscription)
}

export async function recordSubscriptionRenewalPayment(
  subscription: Stripe.Subscription,
  invoice: Stripe.Invoice
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    include: {
      orderItems: {
        include: { order: true },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!enrollment) return

  const order = enrollment.orderItems[0]?.order
  if (!order) return

  const amount = (invoice.amount_paid ?? 0) / 100
  const currency = (invoice.currency ?? order.currency).toUpperCase()
  const paymentIntentId = getInvoicePaymentIntentId(invoice)

  await prisma.payment.create({
    data: {
      orderId: order.id,
      userId: enrollment.userId,
      amount,
      currency,
      destination: 'dao_treasury',
      destinationAddress: 'stripe',
      provider: 'stripe',
      status: 'confirmed',
      confirmedAt: new Date(),
      transactionHash: paymentIntentId ?? invoice.id,
      metadata: toInputJson({
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: subscription.id,
        billingReason: invoice.billing_reason,
      }),
    },
  })

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'paid',
      completedAt: new Date(),
      metadata: toInputJson({
        ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}),
        stripeSubscriptionId: subscription.id,
        lastInvoiceId: invoice.id,
      }),
    },
  })
}
