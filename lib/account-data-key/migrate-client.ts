import { authFetch } from '@/lib/auth/client'
import type { DataKeyMode } from './constants'
import type { DataKeyAadInput } from './mode'
import {
  dataKeyAadInput,
  resolveEffectiveDataKeyMode,
} from './mode'
import {
  decryptSafeNotesPayload,
  deriveAccountDataAesKey,
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

/** AES keys for wallet vs account mode differ; migration must decrypt/encrypt with the right pair. */
export async function resolveMigrationCryptoKeys(params: {
  userId: string
  fromMode: DataKeyMode
  targetMode: DataKeyMode
  walletSignatureKey: CryptoKey
}): Promise<{ fromKey: CryptoKey; toKey: CryptoKey }> {
  const accountKey = await deriveAccountDataAesKey(params.userId)
  const fromKey = params.fromMode === 'account' ? accountKey : params.walletSignatureKey
  const toKey = params.targetMode === 'account' ? accountKey : params.walletSignatureKey
  return { fromKey, toKey }
}

export async function migrateDataKeyMode(params: {
  userId: string
  eoaAddress: string
  walletSignatureKey: CryptoKey
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

  const { fromKey, toKey } = await resolveMigrationCryptoKeys({
    userId: params.userId,
    fromMode,
    targetMode: params.targetMode,
    walletSignatureKey: params.walletSignatureKey,
  })

  const archiveRow = await fetchPsychatArchiveRow()
  if (archiveRow?.ciphertext && archiveRow.iv) {
    let opened: PsychatArchivePayload
    try {
      opened = (await decryptPsychatArchivePayload(
        fromKey,
        fromAad,
        archiveRow.ciphertext,
        archiveRow.iv
      )) as PsychatArchivePayload
    } catch {
      throw new Error(
        'No se pudo descifrar el archivo Psychat con el modo actual. Usa la misma wallet con la que cifraste.'
      )
    }
    const reencrypted = await encryptPsychatArchivePayload(toKey, toAad, opened)
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
    let payload: Awaited<ReturnType<typeof decryptSafeNotesPayload>>
    try {
      payload = await decryptSafeNotesPayload(fromKey, fromAad, row.ciphertext, row.iv)
    } catch {
      throw new Error(
        'No se pudo descifrar la bitácora con el modo actual. Usa la misma wallet con la que cifraste.'
      )
    }
    const reencrypted = await encryptSafeNotesPayload(toKey, toAad, payload)
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