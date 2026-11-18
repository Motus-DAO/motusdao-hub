import { authFetch } from '@/lib/auth/client'
import type { DataKeyMode } from './constants'

export type DataKeyPrefsResponse = {
  dataKeyMode: DataKeyMode
  dataKeyVersion: number
  dataKeyWalletEoa: string | null
  effectiveKeyVersion: number
  isLegacy: boolean
  hasEncryptedData: boolean
}

export async function fetchDataKeyPrefs(): Promise<DataKeyPrefsResponse | null> {
  const res = await authFetch('/api/profile/data-key-mode')
  if (!res.ok) return null
  return (await res.json()) as DataKeyPrefsResponse
}

export async function patchDataKeyMode(input: {
  mode: DataKeyMode
  migrationComplete?: boolean
  walletEoa?: string | null
}): Promise<{ ok: true; prefs: DataKeyPrefsResponse } | { ok: false; status: number; body: unknown }> {
  const res = await authFetch('/api/profile/data-key-mode', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, status: res.status, body }
  }
  return { ok: true, prefs: body as DataKeyPrefsResponse }
}