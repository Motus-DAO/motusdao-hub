import { authFetch } from '@/lib/auth/client'
import type { PsychatArchiveExportFile } from './export-format'
import { parsePsychatArchiveExportFile } from './export-format'
import { decryptPsychatArchivePayload } from './crypto'
import type { PsychatArchivePayload } from './payload'

export async function readPsychatArchiveExportFile(file: File): Promise<PsychatArchiveExportFile> {
  const text = await file.text()
  return parsePsychatArchiveExportFile(text)
}

export function assertPsychatExportMatchesWallet(
  exportFile: PsychatArchiveExportFile,
  eoaAddress: string
): void {
  if (exportFile.eoaAddress.toLowerCase() !== eoaAddress.toLowerCase()) {
    throw new Error(
      'Este archivo pertenece a otra wallet. Conecta la wallet que usaste al exportar.'
    )
  }
}

export async function previewPsychatArchiveExport(
  exportFile: PsychatArchiveExportFile,
  eoaAddress: string,
  key: CryptoKey
): Promise<PsychatArchivePayload | null> {
  assertPsychatExportMatchesWallet(exportFile, eoaAddress)
  const row = exportFile.snapshots[0]
  if (!row) return null
  return decryptPsychatArchivePayload(key, eoaAddress, row.ciphertext, row.iv)
}

export async function restorePsychatExportToAccount(
  eoaAddress: string,
  exportFile: PsychatArchiveExportFile
): Promise<number> {
  assertPsychatExportMatchesWallet(exportFile, eoaAddress)
  const row = exportFile.snapshots[0]
  if (!row) return 0
  const res = await authFetch('/api/psychat/archive', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ciphertext: row.ciphertext,
      iv: row.iv,
      keyVersion: exportFile.keyVersion,
    }),
  })
  if (!res.ok) {
    throw new Error(
      'No se pudo guardar en tu cuenta Motus. ¿Tienes activada la copia cifrada en Psychat?'
    )
  }
  return 1
}
