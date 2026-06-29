import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined
}

export function getStripePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || undefined
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey())
}

export function getStripeClient(): Stripe {
  const secretKey = getStripeSecretKey()
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-06-24.dahlia',
      typescript: true,
    })
  }

  return stripeClient
}

/** Convert a decimal price to Stripe's smallest currency unit (e.g. MXN centavos). */
export function toStripeUnitAmount(amount: number, currency: string): number {
  const zeroDecimal = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'])
  if (zeroDecimal.has(currency.toLowerCase())) {
    return Math.round(amount)
  }
  return Math.round(amount * 100)
}
