import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { fulfillCourseFromStripeSession } from '@/lib/academy/stripe-session'
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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      await fulfillCourseFromStripeSession(session)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handler failed:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
