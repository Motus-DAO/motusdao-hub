/** Platform-wide therapy session pricing (USD). */
export const PLATFORM_SESSION_PRICE_USD = 45

/**
 * Session price in wMXN, charged by the escrow.
 *
 * While the mainnet demo runs, wMXN is quoted 1:1 with USDT, so a 45 USD
 * session costs 45 wMXN instead of 45 × 18.5 = 832.5. Raise this constant to
 * restore the FX-based price.
 */
export const PLATFORM_SESSION_PRICE_WMXN = 45

/** Minimum published reviews before showing numeric average. */
export const MIN_REVIEWS_FOR_AVERAGE = 3

export const PLATFORM_SESSION_CURRENCY = 'USD' as const

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://app.motusdao.org'
