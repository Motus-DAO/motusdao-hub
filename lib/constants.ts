/** Platform-wide therapy session pricing (USD). */
export const PLATFORM_SESSION_PRICE_USD = 45

/** Minimum published reviews before showing numeric average. */
export const MIN_REVIEWS_FOR_AVERAGE = 3

export const PLATFORM_SESSION_CURRENCY = 'USD' as const

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://app.motusdao.org'
