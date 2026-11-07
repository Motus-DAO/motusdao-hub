import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getRequestOrigin } from '@/lib/auth/session'
import { SITE_URL } from '@/lib/constants'

export const THERAPY_CHECKOUT_KIND = 'therapy_booking'
export const CANCEL_NOTICE_MS = 48 * 60 * 60 * 1000
export const CHECKOUT_HOLD_MS = 31 * 60 * 1000
const DEFAULT_FEE_BPS = 1000
const MAX_FEE_BPS = 5000

const PAIS_ISO: Record<string, string> = {
  mexico: 'MX',
  colombia: 'CO',
  argentina: 'AR',
  chile: 'CL',
  peru: 'PE',
  venezuela: 'VE',
  ecuador: 'EC',
  bolivia: 'BO',
  paraguay: 'PY',
  uruguay: 'UY',
  espana: 'ES',
  españa: 'ES',
}

export function connectFeeBps(): number {
  const raw = process.env.STRIPE_CONNECT_FEE_BPS
  if (!raw) return DEFAULT_FEE_BPS
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_FEE_BPS) return DEFAULT_FEE_BPS
  return parsed
}

/** Stripe requires the application fee to be lower than the charge. */
export function applicationFeeCents(amountCents: number, bps = connectFeeBps()): number {
  if (amountCents <= 1) return 0
  const fee = Math.round((amountCents * bps) / 10000)
  if (fee <= 0) return 0
  if (fee >= amountCents) return amountCents - 1
  return fee
}

export function cancellationRefundAllowed(scheduledStart: Date | null | undefined, now: Date): boolean {
  if (!scheduledStart) return false
  return scheduledStart.getTime() - now.getTime() >= CANCEL_NOTICE_MS
}

export function stripeCountryCode(pais: string | null | undefined): string | null {
  if (!pais) return null
  const key = pais.trim().toLowerCase()
  return PAIS_ISO[key] ?? null
}

export const PLATFORM_CONNECT_COUNTRY = 'MX'

/**
 * Components exposed to a therapist through `POST /api/stripe/connect/account-session`.
 *
 * The account has `dashboard: 'none'` with Stripe collecting fees and bearing
 * losses, so Stripe is also responsible for collecting requirements. That
 * combination requires account management and the notification banner;
 * documents are required because Stripe charges its fees to the connected
 * account directly.
 */
export function connectAccountSessionComponents(): Stripe.AccountSessionCreateParams['components'] {
  return {
    account_management: {
      enabled: true,
      features: { external_account_collection: true },
    },
    balances: {
      enabled: true,
      features: {
        edit_payout_schedule: true,
        external_account_collection: true,
      },
    },
    documents: { enabled: true },
    notification_banner: {
      enabled: true,
      features: { external_account_collection: true },
    },
    payments: {
      enabled: true,
      features: {
        capture_payments: true,
        dispute_management: true,
        refund_management: true,
      },
    },
    payouts: {
      enabled: true,
      features: {
        edit_payout_schedule: true,
        external_account_collection: true,
      },
    },
  }
}

export type ConnectAccountStatus = {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  onboardingComplete: boolean
  requirementsDue: boolean
}

/**
 * Accounts v2 only return `configuration` and `requirements` when the call
 * includes them explicitly: `include: ['configuration.merchant', 'requirements']`.
 */
export function mapV2AccountStatus(account: Stripe.V2.Core.Account): ConnectAccountStatus {
  const merchant = account.configuration?.merchant
  const cardPayments = merchant?.capabilities?.card_payments?.status
  const payouts = merchant?.capabilities?.stripe_balance?.payouts?.status
  const deadline = account.requirements?.summary?.minimum_deadline?.status
  const requirementsDue = deadline === 'currently_due' || deadline === 'past_due'

  return {
    chargesEnabled: cardPayments === 'active',
    payoutsEnabled: payouts === 'active',
    onboardingComplete: !requirementsDue,
    requirementsDue,
  }
}

export function browserOrigin(request: NextRequest): string {
  const originHeader = request.headers.get('origin')
  if (originHeader) {
    try {
      return new URL(originHeader).origin
    } catch {
      // fall through
    }
  }
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin
    } catch {
      // fall through
    }
  }
  return getRequestOrigin(request) || SITE_URL.replace(/\/$/, '')
}
