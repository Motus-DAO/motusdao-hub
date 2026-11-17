import { randomBytes } from 'crypto'
import type { FoundingWaitlistRole } from '@prisma/client'

export function newFoundingEntryId(role: FoundingWaitlistRole): string {
  const tag = role === 'user' ? 'U' : 'P'
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const hex = randomBytes(4).toString('hex').toUpperCase()
  return `FOUND-${tag}-${ymd}-${hex}`
}