import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'

/**
 * Session price shown to the patient and used by the escrow.
 *
 * `NEXT_PUBLIC_THERAPY_TEST_PRICE_WMXN` is a local/demo override so the full
 * booking → escrow → payout flow can be tested with 10 wMXN instead of
 * 45 USD × FX. Do not set it in production.
 */
export function mxnPerUsd(): number {
  const raw = Number(process.env.MOTUS_MXN_PER_USD || '18.5')
  return Number.isFinite(raw) && raw > 0 ? raw : 18.5
}

export function sessionPriceWmxn(): {
  mxn: number
  usd: number
  rate: number
  test: boolean
} {
  const test = Number(process.env.NEXT_PUBLIC_THERAPY_TEST_PRICE_WMXN || '')
  const rate = mxnPerUsd()

  if (Number.isFinite(test) && test > 0) {
    return { mxn: test, usd: PLATFORM_SESSION_PRICE_USD, rate, test: true }
  }

  return {
    mxn: Math.round(PLATFORM_SESSION_PRICE_USD * rate * 100) / 100,
    usd: PLATFORM_SESSION_PRICE_USD,
    rate,
    test: false,
  }
}
