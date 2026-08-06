import type { CourseCurrency } from '@/lib/academy/course-pricing'

export type UsdMxnRate = {
  rate: number
  date: string
  source: 'frankfurter' | 'fallback'
}

const CACHE_TTL_MS = 60 * 60 * 1000
const FALLBACK_USD_MXN = Number(process.env.FX_USD_MXN_FALLBACK) || 17.25

let cached: { value: UsdMxnRate; expiresAt: number } | null = null

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function convertAmount(
  amount: number,
  from: CourseCurrency,
  to: CourseCurrency,
  usdToMxn: number
): number {
  if (!Number.isFinite(amount) || amount < 0) return 0
  if (from === to) return roundMoney(amount)
  if (from === 'USD' && to === 'MXN') return roundMoney(amount * usdToMxn)
  return roundMoney(amount / usdToMxn)
}

async function fetchFrankfurterUsdToMxn(): Promise<UsdMxnRate> {
  const response = await fetch('https://api.frankfurter.dev/v2/rate/USD/MXN', {
    next: { revalidate: 3600 },
  })
  if (!response.ok) {
    throw new Error(`Frankfurter HTTP ${response.status}`)
  }
  const body = (await response.json()) as { rate?: number; date?: string }
  if (!body.rate || !Number.isFinite(body.rate) || body.rate <= 0) {
    throw new Error('Frankfurter returned an invalid USD/MXN rate')
  }
  return {
    rate: body.rate,
    date: body.date || new Date().toISOString().slice(0, 10),
    source: 'frankfurter',
  }
}

/** Cached USD→MXN mid-market rate for Academy dual-currency pricing. */
export async function getUsdToMxnRate(): Promise<UsdMxnRate> {
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  try {
    const value = await fetchFrankfurterUsdToMxn()
    cached = { value, expiresAt: now + CACHE_TTL_MS }
    return value
  } catch (error) {
    console.warn('USD/MXN FX fetch failed, using fallback:', error)
    if (cached) return cached.value
    const fallback: UsdMxnRate = {
      rate: FALLBACK_USD_MXN,
      date: new Date().toISOString().slice(0, 10),
      source: 'fallback',
    }
    cached = { value: fallback, expiresAt: now + 5 * 60 * 1000 }
    return fallback
  }
}
