import { courseRequiresPayment } from '@/lib/academy/course-pricing'

export type CourseBillingInterval = 'one_time' | 'monthly'

type CourseAccessContext = {
  billingInterval?: string | null
  priceAmount?: string | number | { toString(): string } | null
  isFree?: boolean
}

type EnrollmentAccessContext = {
  purchasedAt?: Date | string | null
  accessExpiresAt?: Date | string | null
}

export function normalizeBillingInterval(value?: string | null): CourseBillingInterval {
  return value === 'monthly' ? 'monthly' : 'one_time'
}

export function isMonthlyCourse(course: CourseAccessContext): boolean {
  return normalizeBillingInterval(course.billingInterval) === 'monthly'
}

export function hasActiveEnrollmentAccess(
  enrollment: EnrollmentAccessContext | null | undefined,
  course: CourseAccessContext
): boolean {
  if (!enrollment) return false
  if (!courseRequiresPayment(course)) return true

  if (isMonthlyCourse(course)) {
    if (!enrollment.accessExpiresAt) return false
    return new Date(enrollment.accessExpiresAt) > new Date()
  }

  return Boolean(enrollment.purchasedAt)
}
