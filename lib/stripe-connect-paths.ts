/**
 * Public routes for the therapist's Stripe Connect dashboard.
 *
 * Stripe appends `stripe_account_id` to the links it sends by email, so every
 * page has to read and validate that query parameter before opening an
 * AccountSession. The same routes are registered in the platform's
 * Dashboard → Settings → Connect → Site links.
 */
export const CONNECT_PATHS = {
  home: '/cobros',
  account: '/cobros/cuenta',
  payments: '/cobros/pagos',
  payouts: '/cobros/depositos',
  balances: '/cobros/saldos',
  documents: '/cobros/documentos',
} as const

export type ConnectSection = keyof typeof CONNECT_PATHS

/** Component → page that hosts it (Stripe "Site links" configuration). */
export const CONNECT_SITE_LINKS: Record<
  'notification_banner' | 'account_management' | 'payouts' | 'payments' | 'balances' | 'documents',
  string
> = {
  notification_banner: CONNECT_PATHS.home,
  account_management: CONNECT_PATHS.account,
  payouts: CONNECT_PATHS.payouts,
  payments: CONNECT_PATHS.payments,
  balances: CONNECT_PATHS.balances,
  documents: CONNECT_PATHS.documents,
}

export const STRIPE_ACCOUNT_ID_PARAM = 'stripe_account_id'

export type ConnectSearchParams = {
  stripe_account_id?: string | string[]
  /** Set by the hosted onboarding return/refresh URLs. */
  stripe_connect?: string | string[]
}

export function requestedConnectAccountId(
  params: ConnectSearchParams
): string | undefined {
  return Array.isArray(params.stripe_account_id)
    ? params.stripe_account_id[0]
    : params.stripe_account_id
}

export function shouldRefreshConnectStatus(params: ConnectSearchParams): boolean {
  const value = Array.isArray(params.stripe_connect)
    ? params.stripe_connect[0]
    : params.stripe_connect
  return value === 'return' || value === 'refresh'
}

const STRIPE_ACCOUNT_ID_PATTERN = /^acct_[A-Za-z0-9]+$/

export function isValidStripeAccountId(value: unknown): value is string {
  return typeof value === 'string' && STRIPE_ACCOUNT_ID_PATTERN.test(value)
}

export function getStripeConnectPublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_CONNECT_PUBLISHABLE_KEY?.trim() || undefined
}

/**
 * Keeps the connected account in internal links. The therapist normally has a
 * single account, but preserving the parameter makes every link explicit and
 * keeps Stripe's email entry point intact across tabs.
 */
export function connectSectionHref(
  section: ConnectSection,
  accountId?: string | null
): string {
  const path = CONNECT_PATHS[section]
  return accountId
    ? `${path}?${STRIPE_ACCOUNT_ID_PARAM}=${encodeURIComponent(accountId)}`
    : path
}
