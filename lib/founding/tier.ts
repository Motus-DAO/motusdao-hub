import type { FoundingWaitlistTier } from '@prisma/client'

export type FoundingTierBand = {
  tier: FoundingWaitlistTier
  discountPercent: 50 | 30 | 10
}

/** Tier locked at signup position (SDD §3). */
export function foundingTierForPosition(position: number): FoundingTierBand {
  if (position <= 10) return { tier: 'A', discountPercent: 50 }
  if (position <= 30) return { tier: 'B', discountPercent: 30 }
  return { tier: 'C', discountPercent: 10 }
}