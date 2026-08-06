import type Stripe from 'stripe'
import { getSubscriptionCurrentPeriodEnd } from '@/lib/academy/stripe-api-helpers'
import { normalizeBillingInterval } from '@/lib/academy/enrollment-access'
import { fulfillStripeCourseCheckout } from '@/lib/academy/stripe-fulfillment'
import { getStripeClient } from '@/lib/stripe'

export async function stripeSessionToFulfillmentParams(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId
  const userId = session.metadata?.userId
  const courseId = session.metadata?.courseId
  const billingInterval = normalizeBillingInterval(session.metadata?.billingInterval)

  if (!orderId || !userId || !courseId) {
    throw new Error('Stripe session missing metadata')
  }

  if (session.mode === 'subscription') {
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      throw new Error('Payment not completed')
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

    if (!subscriptionId) {
      throw new Error('Stripe subscription missing from checkout session')
    }

    const stripe = getStripeClient()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const amountTotal = session.amount_total ?? subscription.items.data[0]?.price?.unit_amount
    const currency = session.currency ?? subscription.items.data[0]?.price?.currency

    if (amountTotal == null || !currency) {
      throw new Error('Stripe subscription missing amount or currency')
    }

    return {
      orderId,
      userId,
      courseId,
      amount: amountTotal / 100,
      currency: currency.toUpperCase(),
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
      stripeSubscriptionId: subscription.id,
      accessExpiresAt: getSubscriptionCurrentPeriodEnd(subscription),
      billingInterval,
    }
  }

  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed')
  }

  const amountTotal = session.amount_total
  const currency = session.currency
  if (amountTotal == null || !currency) {
    throw new Error('Stripe session missing amount or currency')
  }

  return {
    orderId,
    userId,
    courseId,
    amount: amountTotal / 100,
    currency: currency.toUpperCase(),
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
    billingInterval,
  }
}

export async function fulfillCourseFromStripeSession(session: Stripe.Checkout.Session) {
  return fulfillStripeCourseCheckout(await stripeSessionToFulfillmentParams(session))
}
