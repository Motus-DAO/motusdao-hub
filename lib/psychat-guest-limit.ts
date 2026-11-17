const WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_MESSAGES_PER_DAY = 8

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export const PSYCHAT_GUEST_CONSENT_VERSION = 'guest_v1'

export function clientKeyFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  return `guest:${ip}`
}

export function checkPsychatGuestLimit(key: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, bucket)
  }
  const remaining = Math.max(0, MAX_MESSAGES_PER_DAY - bucket.count)
  return {
    allowed: bucket.count < MAX_MESSAGES_PER_DAY,
    remaining,
    resetAt: bucket.resetAt,
  }
}

export function consumePsychatGuestMessage(key: string): void {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
  }
  bucket.count += 1
  buckets.set(key, bucket)
}

/** @internal tests */
export function resetPsychatGuestLimitsForTests(): void {
  buckets.clear()
}