import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripeConnectClient, getStripeConnectWebhookSecret } from '@/lib/stripe'
import { mapV2AccountStatus } from '@/lib/stripe-connect'
import { syncConnectedAccount } from '@/lib/stripe-therapy'

export const runtime = 'nodejs'

/**
 * Accounts v2 events for accounts the platform created are delivered to the
 * "Your account" scope as thin events. We only care about requirement changes
 * and merchant capability updates; both mean the stored flags may be stale.
 */
const RELEVANT_EVENTS = new Set<string>([
  'v2.core.account[requirements].updated',
  'v2.core.account[configuration.merchant].capability_status_updated',
])

type ThinNotification = {
  type: string
  related_object?: { id?: string; type?: string }
}

export async function POST(request: NextRequest) {
  const secret = getStripeConnectWebhookSecret()
  if (!secret) {
    console.error('STRIPE_CONNECT_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const body = await request.text()
  const stripe = getStripeConnectClient()

  let notification: Stripe.V2.Core.EventNotification
  try {
    notification = stripe.parseEventNotification(body, signature, secret)
  } catch (error) {
    console.error('[stripe-connect-webhook] signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(notification.type)) {
    return NextResponse.json({ received: true })
  }

  const accountId = (notification as unknown as ThinNotification).related_object?.id
  if (!accountId) {
    console.warn('[stripe-connect-webhook] event without account id', notification.type)
    return NextResponse.json({ received: true })
  }

  try {
    const account = await stripe.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.merchant', 'requirements'],
    })
    await syncConnectedAccount(account.id, mapV2AccountStatus(account))
  } catch (error) {
    console.error('[stripe-connect-webhook] account sync failed', accountId, error)
    return NextResponse.json({ error: 'Account sync failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
