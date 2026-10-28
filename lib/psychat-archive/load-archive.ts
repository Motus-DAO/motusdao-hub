import { decryptPsychatArchivePayload } from './crypto'
import { fetchPsychatArchiveRow } from './client'
import type { PsychatArchivePayload } from './payload'
import type { PsychatArchiveExportFile } from './export-format'
import { assertPsychatExportMatchesWallet } from './restore-from-export'

export async function loadPsychatArchiveFromServer(
  eoaAddress: string,
  key: CryptoKey
): Promise<PsychatArchivePayload | null> {
  const row = await fetchPsychatArchiveRow()
  if (!row) return null
  return decryptPsychatArchivePayload(key, eoaAddress, row.ciphertext, row.iv)
}

export async function loadPsychatArchiveFromExportFile(
  exportFile: PsychatArchiveExportFile,
  eoaAddress: string,
  key: CryptoKey
): Promise<PsychatArchivePayload | null> {
  assertPsychatExportMatchesWallet(exportFile, eoaAddress)
  const row = exportFile.snapshots[0]
  if (!row) return null
  return decryptPsychatArchivePayload(key, eoaAddress, row.ciphertext, row.iv)
}
