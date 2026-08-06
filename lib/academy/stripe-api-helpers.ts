import type Stripe from 'stripe'

/** Dahlia API: billing period end lives on subscription items; legacy APIs use the subscription root. */
export function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): Date {
  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end
  if (typeof legacy === 'number' && Number.isFinite(legacy)) {
    return new Date(legacy * 1000)
  }

  const items = subscription.items?.data ?? []
  let maxEnd: number | null = null

  for (const item of items) {
    const end = item.current_period_end
    if (typeof end === 'number' && Number.isFinite(end)) {
      if (maxEnd === null || end > maxEnd) maxEnd = end
    }
  }

  if (maxEnd !== null) {
    return new Date(maxEnd * 1000)
  }

  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
}

export function getSubscriptionEndedAt(subscription: Stripe.Subscription): Date {
  const endedAt = subscription.ended_at ?? subscription.canceled_at
  if (typeof endedAt === 'number') return new Date(endedAt * 1000)
  return getSubscriptionCurrentPeriodEnd(subscription)
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null
  }).subscription

  if (typeof legacy === 'string') return legacy
  if (legacy && typeof legacy === 'object' && 'id' in legacy) return legacy.id

  const parentSub = invoice.parent?.subscription_details?.subscription
  if (typeof parentSub === 'string') return parentSub
  if (parentSub && typeof parentSub === 'object' && 'id' in parentSub) {
    return parentSub.id
  }

  const line = invoice.lines?.data?.[0]
  const fromLine =
    line?.parent?.subscription_item_details?.subscription ??
    line?.parent?.invoice_item_details?.subscription

  if (typeof fromLine === 'string') return fromLine
  return null
}

export function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as Stripe.Invoice & {
    payment_intent?: string | { id: string } | null
  }).payment_intent

  if (typeof legacy === 'string') return legacy
  if (legacy && typeof legacy === 'object' && 'id' in legacy) return legacy.id

  const payment = invoice.payments?.data?.find((entry) => entry.status === 'paid')?.payment
  if (!payment) return null

  const intent = payment.payment_intent
  if (typeof intent === 'string') return intent
  if (intent && typeof intent === 'object' && 'id' in intent) return intent.id
  return null
}
