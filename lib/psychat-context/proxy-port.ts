import { ROOTROUTER_DEFAULT_PROXY_URL } from '@/lib/psychat-context/constants'

export const ROOTROUTER_FALLBACK_PROXY_PORT = 8790

export function parseLocalProxyPort(
  localProxyUrl: string,
  defaultPort = 8787
): number {
  const raw = localProxyUrl.trim() || ROOTROUTER_DEFAULT_PROXY_URL
  try {
    const u = new URL(raw)
    if (u.port) {
      const n = Number(u.port)
      if (Number.isFinite(n) && n > 0 && n < 65536) return n
    }
    return defaultPort
  } catch {
    return defaultPort
  }
}

/** Toggle 8787 ↔ 8790 when another app (e.g. Hermes) owns the default port. */
export function alternatePsychatProxyUrl(localProxyUrl: string): string {
  const port = parseLocalProxyPort(localProxyUrl)
  const nextPort = port === 8787 ? ROOTROUTER_FALLBACK_PROXY_PORT : 8787
  return `http://127.0.0.1:${nextPort}`
}
