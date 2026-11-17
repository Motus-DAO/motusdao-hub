import type { FoundingWaitlistRole, FoundingWaitlistTier } from '@prisma/client'

export function resolveFoundingCouponId(
  role: FoundingWaitlistRole,
  tier: FoundingWaitlistTier
): string | null {
  const tierKey = tier === 'A' ? '50' : tier === 'B' ? '30' : '10'
  const roleKey = role === 'user' ? 'USER' : 'PSM'
  const envKey = `STRIPE_FOUNDING_COUPON_${roleKey}_${tierKey}`
  const value = process.env[envKey]?.trim()
  return value && value.length > 0 ? value : null
}