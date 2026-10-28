import {
  PSYCHAT_CONTEXT_SETTINGS_KEY,
  ROOTROUTER_DEFAULT_PROXY_URL,
  type PsychatContextMode,
} from '@/lib/psychat-context/constants'

export type PsychatContextSettings = {
  mode: PsychatContextMode
  localProxyUrl: string
  sessionEnclaveUrl: string
  acknowledgedLocalSetup: boolean
}

const DEFAULTS: PsychatContextSettings = {
  mode: 'hub_default',
  localProxyUrl: ROOTROUTER_DEFAULT_PROXY_URL,
  sessionEnclaveUrl: '',
  acknowledgedLocalSetup: false,
}

export function defaultPsychatContextSettings(): PsychatContextSettings {
  return { ...DEFAULTS }
}

export function readPsychatContextSettings(): PsychatContextSettings {
  if (typeof window === 'undefined') return defaultPsychatContextSettings()
  try {
    const raw = localStorage.getItem(PSYCHAT_CONTEXT_SETTINGS_KEY)
    if (!raw) return defaultPsychatContextSettings()
    const parsed = JSON.parse(raw) as Partial<PsychatContextSettings>
    return {
      ...DEFAULTS,
      ...parsed,
      localProxyUrl: parsed.localProxyUrl?.trim() || ROOTROUTER_DEFAULT_PROXY_URL,
    }
  } catch {
    return defaultPsychatContextSettings()
  }
}

export function writePsychatContextSettings(next: PsychatContextSettings): void {
  localStorage.setItem(PSYCHAT_CONTEXT_SETTINGS_KEY, JSON.stringify(next))
}

export function resolveProxyBaseUrl(settings: PsychatContextSettings): string | null {
  if (settings.mode === 'local_rootrouter') {
    return settings.localProxyUrl.replace(/\/$/, '')
  }
  if (settings.mode === 'session_enclave' && settings.sessionEnclaveUrl.trim()) {
    return settings.sessionEnclaveUrl.trim().replace(/\/$/, '')
  }
  return null
}

export function isEnclaveMode(mode: PsychatContextMode): boolean {
  return mode === 'session_enclave' || mode === 'always_on_enclave'
}
