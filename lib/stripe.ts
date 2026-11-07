import Stripe from 'stripe'

let stripeClient: Stripe | null = null
let stripeConnectClient: Stripe | null = null

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

export function getStripeConnectSecretKey(): string | undefined {
  return process.env.STRIPE_CONNECT_SECRET_KEY?.trim() || undefined
}

/** Thin events destination (Accounts v2 requirements/capability changes). */
export function getStripeConnectWebhookSecret(): string | undefined {
  return process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim() || undefined
}

/** Snapshot destination for v1 events from connected accounts (Checkout). */
export function getStripeConnectPaymentsWebhookSecret(): string | undefined {
  return process.env.STRIPE_CONNECT_PAYMENTS_WEBHOOK_SECRET?.trim() || undefined
}

export function isStripeConnectConfigured(): boolean {
  return Boolean(getStripeConnectSecretKey())
}

export function getStripeConnectClient(): Stripe {
  const secretKey = getStripeConnectSecretKey()
  if (!secretKey) {
    throw new Error('STRIPE_CONNECT_SECRET_KEY is not configured')
  }

  if (!stripeConnectClient) {
    stripeConnectClient = new Stripe(secretKey, {
      apiVersion: '2026-06-24.dahlia',
      typescript: true,
    })
  }

  return stripeConnectClient
}

/** Convert a decimal price to Stripe's smallest currency unit (e.g. MXN centavos). */
export function toStripeUnitAmount(amount: number, currency: string): number {
  const zeroDecimal = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'])
  if (zeroDecimal.has(currency.toLowerCase())) {
    return Math.round(amount)
  }
  return Math.round(amount * 100)
}
