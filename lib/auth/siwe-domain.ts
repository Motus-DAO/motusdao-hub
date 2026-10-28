import { AuthError } from './errors'

function normalizeHost(host: string): string {
  return host.trim().toLowerCase()
}

/** Hosts that may appear in a SIWE message domain field. Never trust raw x-forwarded-host alone. */
export function getAllowedSiweDomains(): Set<string> {
  const hosts = new Set<string>()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      hosts.add(normalizeHost(new URL(appUrl).host))
    } catch {
      // ignore malformed env
    }
  }

  const extra = process.env.SIWE_ALLOWED_DOMAINS?.split(',') ?? []
  for (const entry of extra) {
    const host = normalizeHost(entry)
    if (host) hosts.add(host)
  }

  if (process.env.NODE_ENV !== 'production') {
    hosts.add('localhost:3000')
    hosts.add('127.0.0.1:3000')
  }

  return hosts
}

/** Domain embedded in issued SIWE messages (from env, not forwarded headers). */
export function getSiweIssueDomain(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      return new URL(appUrl).host
    } catch {
      // fall through
    }
  }
  return 'localhost:3000'
}

export function assertAllowedSiweDomain(domain: string): void {
  const normalized = normalizeHost(domain)
  if (!getAllowedSiweDomains().has(normalized)) {
    throw new AuthError(401, 'Sign-in domain is not allowed')
  }
}
