import type { FoundingWaitlistRole, FoundingWaitlistTier } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'

function percentForTier(tier: FoundingWaitlistTier): number {
  if (tier === 'A') return 50
  if (tier === 'B') return 30
  return 10
}

function envCouponFor(role: FoundingWaitlistRole, tier: FoundingWaitlistTier): string | null {
  const tierKey = tier === 'A' ? '50' : tier === 'B' ? '30' : '10'
  const roleKey = role === 'user' ? 'USER' : 'PSM'
  const value = process.env[`STRIPE_FOUNDING_COUPON_${roleKey}_${tierKey}`]?.trim()
  return value && value.length > 0 ? value : null
}

/**
 * Lab-parity: env override → DB row → Stripe API create (once per role×tier).
 */
export async function resolveFoundingCouponId(
  role: FoundingWaitlistRole,
  tier: FoundingWaitlistTier
): Promise<string> {
  const fromEnv = envCouponFor(role, tier)
  if (fromEnv) return fromEnv

  const existing = await prisma.foundingStripeCouponTemplate.findUnique({
    where: { role_tier: { role, tier } },
  })
  if (existing?.couponId) return existing.couponId

  if (!isStripeConfigured()) {
    throw new Error('Stripe no está configurado.')
  }

  const percent = percentForTier(tier)
  const stripe = getStripeClient()
  const created = await stripe.coupons.create({
    percent_off: percent,
    duration: 'once',
    name: `Motus Founding ${role} tier ${tier} (${percent}% once)`,
    metadata: { foundingAllowlist: 'true', foundingRole: role, tier },
  })

  await prisma.foundingStripeCouponTemplate.upsert({
    where: { role_tier: { role, tier } },
    create: { role, tier, couponId: created.id },
    update: { couponId: created.id },
  })

  return created.id
}