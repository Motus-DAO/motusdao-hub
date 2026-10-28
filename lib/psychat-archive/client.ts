import { authFetch } from '@/lib/auth/client'
import {
  PSYCHAT_ARCHIVE_CHANGED_EVENT,
  PSYCHAT_ARCHIVE_EXPORT_FORMAT,
  PSYCHAT_ARCHIVE_EXPORT_VERSION,
  PSYCHAT_ARCHIVE_PURPOSE,
} from '@/lib/psychat-archive/constants'
import {
  encryptPsychatArchivePayload,
  PSYCHAT_ARCHIVE_KEY_VERSION,
} from '@/lib/psychat-archive/crypto'
import type { PsychatArchiveMessage } from '@/lib/psychat-archive/payload'

export type PsychatArchiveApiRow = {
  id: string
  ciphertext: string
  iv: string
  keyVersion: number
  updatedAt: string
}

export function notifyPsychatArchiveChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PSYCHAT_ARCHIVE_CHANGED_EVENT))
}

export async function fetchPsychatArchiveRow(): Promise<PsychatArchiveApiRow | null> {
  const res = await authFetch('/api/psychat/archive')
  if (!res.ok) throw new Error('No se pudo cargar el archivo Psychat')
  const data = (await res.json()) as { snapshot: PsychatArchiveApiRow | null }
  return data.snapshot
}

export async function upsertPsychatArchive(
  eoaAddress: string,
  key: CryptoKey,
  messages: PsychatArchiveMessage[]
): Promise<void> {
  const encrypted = await encryptPsychatArchivePayload(key, eoaAddress, {
    v: 1,
    savedAt: new Date().toISOString(),
    messages,
  })
  const res = await authFetch('/api/psychat/archive', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...encrypted,
      keyVersion: PSYCHAT_ARCHIVE_KEY_VERSION,
    }),
  })
  if (!res.ok) throw new Error('No se pudo guardar el archivo cifrado')
  notifyPsychatArchiveChanged()
}

export async function deletePsychatArchiveOnServer(): Promise<void> {
  const res = await authFetch('/api/psychat/archive', { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw new Error('No se pudo borrar la copia de tu cuenta')
  }
  notifyPsychatArchiveChanged()
}

export async function buildPsychatArchiveExportFile(eoaAddress: string) {
  const row = await fetchPsychatArchiveRow()
  if (!row) {
    return {
      format: PSYCHAT_ARCHIVE_EXPORT_FORMAT,
      version: PSYCHAT_ARCHIVE_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      purpose: PSYCHAT_ARCHIVE_PURPOSE,
      keyVersion: PSYCHAT_ARCHIVE_KEY_VERSION,
      eoaAddress: eoaAddress.toLowerCase(),
      keyRecipeDoc: '/docs/architecture/psychat-archive-export.md',
      snapshots: [] as Array<{
        id: string
        ciphertext: string
        iv: string
        createdAt: string
        updatedAt: string
      }>,
    }
  }
  return {
    format: PSYCHAT_ARCHIVE_EXPORT_FORMAT,
    version: PSYCHAT_ARCHIVE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    purpose: PSYCHAT_ARCHIVE_PURPOSE,
    keyVersion: row.keyVersion,
    eoaAddress: eoaAddress.toLowerCase(),
    keyRecipeDoc: '/docs/architecture/psychat-archive-export.md',
    snapshots: [
      {
        id: row.id,
        ciphertext: row.ciphertext,
        iv: row.iv,
        createdAt: row.updatedAt,
        updatedAt: row.updatedAt,
      },
    ],
  }
}

export function downloadPsychatArchiveExport(
  file: Awaited<ReturnType<typeof buildPsychatArchiveExportFile>>
): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = file.exportedAt.slice(0, 10)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `motus-psychat-archive-export-${stamp}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
