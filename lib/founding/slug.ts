/** Stripe promotion code suffix (SDD §4, espejo Lab). */
export function slugCodePart(displayName: string): string {
  const upper = displayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
  return upper.length > 0 ? upper : 'USER'
}

export function buildFoundingPromotionCode(
  prefix: 'MTU' | 'MTP',
  position: number,
  displayName: string
): string {
  return `${prefix}-${position}-${slugCodePart(displayName)}`
}