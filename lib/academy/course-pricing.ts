type PricedCourse = {
  isFree?: boolean
  priceAmount?: string | number | { toString(): string } | null
}

export function coursePriceAmount(course: PricedCourse): number {
  return Number(course.priceAmount?.toString?.() ?? course.priceAmount ?? 0)
}

export function courseRequiresPayment(course: PricedCourse): boolean {
  if (course.isFree) return false
  return coursePriceAmount(course) > 0
}

export function formatCoursePrice(
  course: PricedCourse & { priceCurrency?: string | null }
): string {
  const amount = coursePriceAmount(course)
  if (!courseRequiresPayment(course)) return 'Gratis'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: course.priceCurrency || 'MXN',
  }).format(amount)
}
