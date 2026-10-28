import type { SafeNotesExportFile } from './export-format'
import { parseSafeNotesExportFile } from './export-format'
import { decryptSafeNotesPayload } from './crypto'
import { authFetch } from '@/lib/auth/client'
import type { BitacoraEntryView } from './client-bitacora'

export async function readExportFile(file: File): Promise<SafeNotesExportFile> {
  const text = await file.text()
  return parseSafeNotesExportFile(text)
}

export function assertExportMatchesWallet(
  exportFile: SafeNotesExportFile,
  eoaAddress: string
): void {
  if (exportFile.eoaAddress.toLowerCase() !== eoaAddress.toLowerCase()) {
    throw new Error(
      'Este archivo pertenece a otra wallet. Conecta la wallet que usaste al exportar.'
    )
  }
}

export async function previewExportEntries(
  exportFile: SafeNotesExportFile,
  eoaAddress: string,
  key: CryptoKey
): Promise<BitacoraEntryView[]> {
  assertExportMatchesWallet(exportFile, eoaAddress)
  const views: BitacoraEntryView[] = []
  for (const row of exportFile.entries) {
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
  return views.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
}

/** Re-upload ciphertext from export (same blobs Motus already could not read). */
export async function restoreExportToAccount(
  userId: string,
  eoaAddress: string,
  exportFile: SafeNotesExportFile
): Promise<number> {
  assertExportMatchesWallet(exportFile, eoaAddress)
  let restored = 0
  for (const row of exportFile.entries) {
    const res = await authFetch('/api/bitacora', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        ciphertext: row.ciphertext,
        iv: row.iv,
        keyVersion: exportFile.keyVersion,
      }),
    })
    if (!res.ok) {
      throw new Error('No se pudo restaurar una entrada en el servidor')
    }
    restored += 1
  }
  return restored
}
