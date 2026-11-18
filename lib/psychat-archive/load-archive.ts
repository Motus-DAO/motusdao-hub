import type { DataKeyAadInput } from '@/lib/account-data-key/mode'
import { exportAadFromMetadata } from '@/lib/account-data-key/export-aad'
import { decryptPsychatArchivePayload } from './crypto'
import { fetchPsychatArchiveRow } from './client'
import type { PsychatArchivePayload } from './payload'
import type { PsychatArchiveExportFile } from './export-format'
import { assertPsychatExportMatchesWallet } from './restore-from-export'

export async function loadPsychatArchiveFromServer(
  aad: DataKeyAadInput,
  key: CryptoKey
): Promise<PsychatArchivePayload | null> {
  const row = await fetchPsychatArchiveRow()
  if (!row) return null
  return decryptPsychatArchivePayload(key, aad, row.ciphertext, row.iv)
}

export async function loadPsychatArchiveFromExportFile(
  exportFile: PsychatArchiveExportFile,
  eoaAddress: string,
  userId: string,
  key: CryptoKey
): Promise<PsychatArchivePayload | null> {
  if (exportFile.dataKeyMode !== 'account') {
    assertPsychatExportMatchesWallet(exportFile, eoaAddress)
  }
  const aad = exportAadFromMetadata({
    dataKeyMode: exportFile.dataKeyMode,
    dataKeyVersion: exportFile.dataKeyVersion ?? exportFile.keyVersion,
    eoaAddress: exportFile.eoaAddress,
    userId,
  })
  const row = exportFile.snapshots[0]
  if (!row) return null
  return decryptPsychatArchivePayload(key, aad, row.ciphertext, row.iv)
}
