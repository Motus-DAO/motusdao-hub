import { getAddress, isAddress } from 'viem'
import type { AuthContext } from '@/lib/auth/session'

/** Hub production: faucet must not send CELO without a signed-in account. */
export function isHubProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

const PIMLICO_ALLOWED_METHODS = new Set([
  'pm_getPaymasterStubData',
  'pm_getPaymasterData',
  'pm_sponsorUserOperation',
  'pimlico_getUserOperationGasPrice',
  'eth_estimateUserOperationGas',
  'eth_sendUserOperation',
  'eth_supportedEntryPoints',
  'eth_chainId',
])

export function isAllowedPimlicoMethod(method: string): boolean {
  return PIMLICO_ALLOWED_METHODS.has(method)
}

export function normalizeSpendAddress(address: string): `0x${string}` | null {
  if (!isAddress(address)) return null
  return getAddress(address)
}

/** Faucet and Ripio bind the request to the SIWE wallet. */
export function sessionOwnsSpendAddress(
  session: AuthContext,
  address: string
): boolean {
  const normalized = normalizeSpendAddress(address)
  if (!normalized) return false
  const sessionEoa = normalizeSpendAddress(session.eoaAddress)
  return sessionEoa !== null && sessionEoa === normalized
}

export function faucetAccountKey(session: AuthContext): string {
  return session.userId ?? session.eoaAddress
}

const CONTACT_WINDOW_MS = 15 * 60 * 1000
const CONTACT_MAX_POSTS = 5
const contactHits = new Map<string, { count: number; resetAt: number }>()

export function contactPostRateLimited(clientKey: string): boolean {
  const key = clientKey.trim().toLowerCase() || 'unknown'
  const now = Date.now()
  const current = contactHits.get(key)
  if (!current || current.resetAt < now) {
    contactHits.set(key, { count: 1, resetAt: now + CONTACT_WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > CONTACT_MAX_POSTS
}

export function contactRateLimitClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}
