import { contactRateLimitClientKey } from '@/lib/platform-spend-guard'

const WINDOW_MS = 15 * 60 * 1000
const MAX_POSTS = 8
const hits = new Map<string, { count: number; resetAt: number }>()

export function foundingWaitlistClientKey(request: Request): string {
  return contactRateLimitClientKey(request)
}

export function foundingWaitlistPostRateLimited(clientKey: string): boolean {
  const key = clientKey.trim().toLowerCase() || 'unknown'
  const now = Date.now()
  const current = hits.get(key)
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > MAX_POSTS
}