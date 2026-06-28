import type { EnrollmentSummary } from '@/lib/academy/public-course'

const TTL_MS = 60 * 1000

let cachedUserId: string | null = null
let cachedEnrollments: EnrollmentSummary[] | null = null
let cachedAt = 0

export function getCachedUserEnrollments(userId: string): EnrollmentSummary[] | null {
  if (cachedUserId !== userId || !cachedEnrollments) return null
  if (Date.now() - cachedAt > TTL_MS) return null
  return cachedEnrollments
}

export function setCachedUserEnrollments(userId: string, enrollments: EnrollmentSummary[]): void {
  cachedUserId = userId
  cachedEnrollments = enrollments
  cachedAt = Date.now()
}

export function invalidateUserEnrollmentsCache(): void {
  cachedUserId = null
  cachedEnrollments = null
  cachedAt = 0
}
