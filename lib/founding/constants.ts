import type { FoundingWaitlistRole } from '@prisma/client'

export type FoundingRoleApi = 'user' | 'psm'

export function parseFoundingRole(value: string): FoundingWaitlistRole | null {
  if (value === 'user' || value === 'psm') return value
  return null
}

export function foundingCapForRole(role: FoundingWaitlistRole): number {
  const key =
    role === 'user' ? 'MKT_FOUNDING_CAP_USER' : 'MKT_FOUNDING_CAP_PSM'
  const raw = process.env[key]
  const parsed = raw ? Number.parseInt(raw, 10) : 100
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100
}

export function codePrefixForRole(role: FoundingWaitlistRole): 'MTU' | 'MTP' {
  return role === 'user' ? 'MTU' : 'MTP'
}