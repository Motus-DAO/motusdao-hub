import { authFetch } from '@/lib/auth/client'
import type { DataKeyMode } from './constants'
import type { DataKeyAadInput } from './mode'
import {
  dataKeyAadInput,
  resolveEffectiveDataKeyMode,
} from './mode'
import {
  decryptSafeNotesPayload,
  encryptSafeNotesPayload,
} from '@/lib/safe-notes/crypto'
import {
  decryptPsychatArchivePayload,
  encryptPsychatArchivePayload,
} from '@/lib/psychat-archive/crypto'
import type { PsychatArchivePayload } from '@/lib/psychat-archive/payload'
import { fetchPsychatArchiveRow } from '@/lib/psychat-archive/client'
import { fetchBitacoraEntries } from '@/lib/safe-notes/client-bitacora'
import { patchDataKeyMode, type DataKeyPrefsResponse } from './profile-client'

export async function migrateDataKeyMode(params: {
  userId: string
  eoaAddress: string
  key: CryptoKey
  fromPrefs: DataKeyPrefsResponse
  targetMode: DataKeyMode
}): Promise<void> {
  const fromMode = resolveEffectiveDataKeyMode({
    dataKeyMode: params.fromPrefs.dataKeyMode,
    dataKeyVersion: params.fromPrefs.dataKeyVersion,
    dataKeyWalletEoa: params.fromPrefs.dataKeyWalletEoa,
  })
  if (fromMode === params.targetMode) {
    return
  }

  const fromAad: DataKeyAadInput = dataKeyAadInput(
    fromMode,
    params.userId,
    params.eoaAddress
  )
  const toAad: DataKeyAadInput = dataKeyAadInput(
    params.targetMode,
    params.userId,
    params.eoaAddress
  )

  const archiveRow = await fetchPsychatArchiveRow()
  if (archiveRow?.ciphertext && archiveRow.iv) {
    const opened = await decryptPsychatArchivePayload(
      params.key,
      fromAad,
      archiveRow.ciphertext,
      archiveRow.iv
    )
    const reencrypted = await encryptPsychatArchivePayload(
      params.key,
      toAad,
      opened as PsychatArchivePayload
    )
    const res = await authFetch('/api/psychat/archive', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...reencrypted,
        keyVersion: reencrypted.keyVersion,
        dataKeyMode: params.targetMode,
      }),
    })
    if (!res.ok) {
      throw new Error('No se pudo migrar el archivo Psychat')
    }
  }

  const entries = await fetchBitacoraEntries(params.userId)
  for (const row of entries) {
    if (!row.iv || !row.ciphertext) continue
    const payload = await decryptSafeNotesPayload(
      params.key,
      fromAad,
      row.ciphertext,
      row.iv
    )
    const reencrypted = await encryptSafeNotesPayload(params.key, toAad, payload)
    const res = await authFetch('/api/bitacora', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.id,
        ...reencrypted,
      }),
    })
    if (!res.ok) {
      throw new Error('No se pudo migrar una entrada de la bitácora')
    }
  }

  const finalized = await patchDataKeyMode({
    mode: params.targetMode,
    migrationComplete: true,
    walletEoa: params.targetMode === 'wallet' ? params.eoaAddress : null,
  })
  if (!finalized.ok) {
    throw new Error('Migración cifrada ok, pero no se pudo guardar la preferencia')
  }
}