import { authFetch } from '@/lib/auth/client'
import {
  decryptSafeNotesPayload,
  encryptSafeNotesPayload,
} from '@/lib/safe-notes/crypto'
import {
  parseLegacyPlaintextRow,
  type SafeNotesPayload,
} from '@/lib/safe-notes/payload'
import { SAFE_NOTES_PAYLOAD_VERSION } from '@/lib/safe-notes/constants'

export type BitacoraEntryView = {
  id: string
  content: string
  mood: string
  tags: string[]
  createdAt: Date
}

type ApiEntry = {
  id: string
  ciphertext: string
  iv: string | null
  needsMigration?: boolean
  createdAt: string
}

export async function fetchBitacoraEntries(userId: string): Promise<ApiEntry[]> {
  const res = await authFetch(`/api/bitacora?userId=${encodeURIComponent(userId)}`)
  if (!res.ok) {
    throw new Error('No se pudo cargar la bitácora')
  }
  const data = (await res.json()) as { entries: ApiEntry[] }
  return data.entries
}

export async function hydrateBitacoraEntries(
  userId: string,
  eoaAddress: string,
  key: CryptoKey
): Promise<BitacoraEntryView[]> {
  const rows = await fetchBitacoraEntries(userId)
  const views: BitacoraEntryView[] = []

  for (const row of rows) {
    if (row.needsMigration || row.iv == null) {
      const legacy = parseLegacyPlaintextRow(row.ciphertext)
      const encrypted = await encryptSafeNotesPayload(key, eoaAddress, legacy)
      await authFetch('/api/bitacora', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          ...encrypted,
        }),
      })
      views.push({
        id: row.id,
        content: legacy.content,
        mood: legacy.mood,
        tags: legacy.tags,
        createdAt: new Date(row.createdAt),
      })
      continue
    }

    const payload = await decryptSafeNotesPayload(
      key,
      eoaAddress,
      row.ciphertext,
      row.iv
    )
    views.push({
      id: row.id,
      content: payload.content,
      mood: payload.mood,
      tags: payload.tags,
      createdAt: new Date(row.createdAt),
    })
  }

  return views
}

export async function saveBitacoraEntry(
  userId: string,
  eoaAddress: string,
  key: CryptoKey,
  input: { content: string; mood: string; tags: string[]; id?: string }
): Promise<{ id: string; createdAt: Date }> {
  const payload: SafeNotesPayload = {
    v: SAFE_NOTES_PAYLOAD_VERSION,
    content: input.content,
    mood: input.mood,
    tags: input.tags,
  }
  const encrypted = await encryptSafeNotesPayload(key, eoaAddress, payload)

  if (input.id) {
    const res = await authFetch('/api/bitacora', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: input.id, ...encrypted }),
    })
    if (!res.ok) throw new Error('No se pudo actualizar la entrada')
    const data = (await res.json()) as {
      entry: { id: string; createdAt: string }
    }
    return { id: data.entry.id, createdAt: new Date(data.entry.createdAt) }
  }

  const res = await authFetch('/api/bitacora', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...encrypted }),
  })
  if (!res.ok) throw new Error('No se pudo guardar la entrada')
  const data = (await res.json()) as {
    entry: { id: string; createdAt: string }
  }
  return { id: data.entry.id, createdAt: new Date(data.entry.createdAt) }
}

export async function deleteBitacoraEntry(id: string): Promise<void> {
  const res = await authFetch(`/api/bitacora?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('No se pudo eliminar la entrada')
}
