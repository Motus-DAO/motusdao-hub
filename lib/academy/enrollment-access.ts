import { courseRequiresPayment, type PricedCourse } from '@/lib/academy/course-pricing'

type EnrollmentPaymentFields = {
  purchasedAt: Date | null
  orderItems?: Array<{ order: { status: string } }>
}

export function enrollmentHasPaidAccess(
  course: PricedCourse,
  enrollment: EnrollmentPaymentFields | null | undefined
): boolean {
  if (!enrollment) return false
  if (!courseRequiresPayment(course)) return true
  if (enrollment.purchasedAt) return true
  return enrollment.orderItems?.some((item) => item.order.status === 'paid') ?? false
}

export function canAccessLessonContent(
  course: PricedCourse,
  lesson: { isFreePreview: boolean },
  enrollment: EnrollmentPaymentFields | null | undefined
): boolean {
  if (lesson.isFreePreview) return true
  return enrollmentHasPaidAccess(course, enrollment)
}
