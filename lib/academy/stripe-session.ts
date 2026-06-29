import type Stripe from 'stripe'
import { fulfillStripeCourseCheckout } from '@/lib/academy/stripe-fulfillment'

export function stripeSessionToFulfillmentParams(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId
  const userId = session.metadata?.userId
  const courseId = session.metadata?.courseId

  if (!orderId || !userId || !courseId) {
    throw new Error('Stripe session missing metadata')
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
  }
}

export async function fulfillCourseFromStripeSession(session: Stripe.Checkout.Session) {
  return fulfillStripeCourseCheckout(stripeSessionToFulfillmentParams(session))
}
