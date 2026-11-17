import type { FoundingWaitlistEntry } from '@prisma/client'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'
import { buildFoundingPromotionCode, slugCodePart } from './slug'
import { codePrefixForRole } from './constants'
import { resolveFoundingCouponId } from './stripe-coupons'

export async function createFoundingStripePromotionCode(
  entry: FoundingWaitlistEntry
): Promise<{ code: string; promotionCodeId: string }> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe no está configurado.')
  }

  const couponId = resolveFoundingCouponId(entry.role, entry.tier)
  if (!couponId) {
    throw new Error(
      `Falta cupón Stripe para ${entry.role} tier ${entry.tier} (env STRIPE_FOUNDING_COUPON_*).`
    )
  }

  const prefix = codePrefixForRole(entry.role)
  const code =
    entry.stripePromotionCode ??
    buildFoundingPromotionCode(prefix, entry.position, entry.displayName)

  const expiresRaw = process.env.FOUNDING_CODE_EXPIRES_AT_UNIX
  const expiresAt = expiresRaw ? Number.parseInt(expiresRaw, 10) : undefined

  const stripe = getStripeClient()
  const promotion = await stripe.promotionCodes.create({
    promotion: {
      type: 'coupon',
      coupon: couponId,
    },
    code,
    max_redemptions: 1,
    ...(Number.isFinite(expiresAt) && expiresAt! > 0
      ? { expires_at: expiresAt }
      : {}),
    metadata: {
      foundingAllowlist: 'true',
      foundingRole: entry.role,
      tier: entry.tier,
      position: String(entry.position),
      waitlistId: entry.id,
    },
  })

  return { code: promotion.code, promotionCodeId: promotion.id }
}

/** Exposed for tests */
export function previewPromotionCode(entry: Pick<FoundingWaitlistEntry, 'role' | 'position' | 'displayName'>): string {
  const prefix = codePrefixForRole(entry.role)
  return buildFoundingPromotionCode(prefix, entry.position, entry.displayName)
}

export { slugCodePart }