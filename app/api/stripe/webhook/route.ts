import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import {
  handleStripeInvoicePaid,
  handleStripeSubscriptionDeleted,
  handleStripeSubscriptionUpdated,
  recordSubscriptionRenewalPayment,
} from '@/lib/academy/stripe-subscription'
import { fulfillCourseFromStripeSession } from '@/lib/academy/stripe-session'
import { getInvoiceSubscriptionId } from '@/lib/academy/stripe-api-helpers'
import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret()
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const body = await request.text()
  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature'
    console.error('Stripe webhook signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await fulfillCourseFromStripeSession(session)
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.billing_reason === 'subscription_cycle') {
          const subscriptionId = getInvoiceSubscriptionId(invoice)
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            await handleStripeInvoicePaid(invoice)
            await recordSubscriptionRenewalPayment(subscription, invoice)
          }
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleStripeSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleStripeSubscriptionDeleted(subscription)
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handler failed:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
