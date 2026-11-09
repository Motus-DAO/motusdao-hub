import {
  PLATFORM_SESSION_PRICE_USD,
  PLATFORM_SESSION_PRICE_WMXN,
} from '@/lib/constants'

/**
 * Session price shown to the patient and used by the escrow.
 *
 * Default price is `PLATFORM_SESSION_PRICE_WMXN` (45 wMXN, 1:1 with USDT while
 * the mainnet demo runs). `NEXT_PUBLIC_THERAPY_TEST_PRICE_WMXN` is a local
 * override for the full booking → escrow → payout flow.
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
    mxn: PLATFORM_SESSION_PRICE_WMXN,
    usd: PLATFORM_SESSION_PRICE_USD,
    rate,
    test: false,
  }
}
