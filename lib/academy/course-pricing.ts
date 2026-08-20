import { isAcademyComplimentaryPreview } from '@/lib/academy/complimentary-preview'
import { convertAmount, type UsdMxnRate } from '@/lib/academy/fx'

export type CourseCurrency = 'MXN' | 'USD'

type PricedCourse = {
  isFree?: boolean
  priceAmount?: string | number | { toString(): string } | null
  priceCurrency?: string | null
  billingInterval?: string | null
}

export function coursePriceSuffix(course: Pick<PricedCourse, 'billingInterval'>): string {
  return course.billingInterval === 'monthly' ? '/mes' : ''
}

export function coursePriceAmount(course: PricedCourse): number {
  return Number(course.priceAmount?.toString?.() ?? course.priceAmount ?? 0)
}

export function courseRequiresPayment(course: PricedCourse): boolean {
  if (isAcademyComplimentaryPreview()) return false
  // priceAmount is the source of truth; isFree can lag behind admin edits
  return coursePriceAmount(course) > 0
}

/** Only MXN and USD are supported for Academy + Stripe checkout. */
export function normalizeCourseCurrency(currency?: string | null): CourseCurrency {
  return currency?.trim().toUpperCase() === 'USD' ? 'USD' : 'MXN'
}

export function formatMoneyAmount(amount: number, currency: CourseCurrency): string {
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount)

  // Always append ISO code — es-MX uses "$" for both MXN and USD otherwise.
  return `${formatted} ${currency}`
}

export function formatCoursePrice(course: PricedCourse): string {
  const amount = coursePriceAmount(course)
  if (!courseRequiresPayment(course)) return 'Gratis'
  return formatMoneyAmount(amount, normalizeCourseCurrency(course.priceCurrency)) + coursePriceSuffix(course)
}

export function courseAmountsInBothCurrencies(
  course: PricedCourse,
  usdToMxn: number
): { MXN: number; USD: number } | null {
  if (!courseRequiresPayment(course)) return null
  const amount = coursePriceAmount(course)
  if (!(amount > 0)) return null
  const base = normalizeCourseCurrency(course.priceCurrency)
  return {
    MXN: convertAmount(amount, base, 'MXN', usdToMxn),
    USD: convertAmount(amount, base, 'USD', usdToMxn),
  }
}

export function formatCoursePriceInCurrency(
  course: PricedCourse,
  currency: CourseCurrency,
  usdToMxn?: number | null
): string {
  if (!courseRequiresPayment(course)) return 'Gratis'
  const amount = coursePriceAmount(course)
  if (!(amount > 0)) return 'Gratis'

  if (usdToMxn && usdToMxn > 0) {
    const amounts = courseAmountsInBothCurrencies(course, usdToMxn)
    if (amounts) return formatMoneyAmount(amounts[currency], currency) + coursePriceSuffix(course)
  }

  const base = normalizeCourseCurrency(course.priceCurrency)
  if (base === currency) return formatMoneyAmount(amount, currency) + coursePriceSuffix(course)
  return formatMoneyAmount(amount, base) + coursePriceSuffix(course)
}

export function formatCoursePriceBoth(course: PricedCourse, usdToMxn: number): string {
  const amounts = courseAmountsInBothCurrencies(course, usdToMxn)
  if (!amounts) return 'Gratis'
  const base = normalizeCourseCurrency(course.priceCurrency)
  const other: CourseCurrency = base === 'USD' ? 'MXN' : 'USD'
  return `${formatMoneyAmount(amounts[base], base)} · ≈ ${formatMoneyAmount(amounts[other], other)}`
}

export function resolveCheckoutCharge(
  course: PricedCourse,
  payCurrency: CourseCurrency,
  quote: Pick<UsdMxnRate, 'rate'>
): { amount: number; currency: CourseCurrency } {
  const baseAmount = coursePriceAmount(course)
  const baseCurrency = normalizeCourseCurrency(course.priceCurrency)
  return {
    currency: payCurrency,
    amount: convertAmount(baseAmount, baseCurrency, payCurrency, quote.rate),
  }
}
