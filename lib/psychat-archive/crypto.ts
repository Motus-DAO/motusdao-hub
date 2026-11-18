import type { DataKeyAadInput } from '@/lib/account-data-key/mode'
import {
  decryptSafeNotesPayload,
  deriveSafeNotesAesKeyFromSignature,
  encryptSafeNotesPayload,
  assertValidStoredCiphertext,
} from '@/lib/safe-notes/crypto'
import {
  parsePsychatArchivePayload,
  serializePsychatArchivePayload,
  type PsychatArchivePayload,
} from './payload'
import { SAFE_NOTES_PAYLOAD_VERSION } from '@/lib/safe-notes/constants'
import { PSYCHAT_ARCHIVE_KEY_VERSION } from './constants'

export { deriveSafeNotesAesKeyFromSignature as derivePsychatArchiveKeyFromSignature }
export { assertValidStoredCiphertext }

export async function encryptPsychatArchivePayload(
  key: CryptoKey,
  aad: DataKeyAadInput | string,
  payload: PsychatArchivePayload
): Promise<{ ciphertext: string; iv: string; keyVersion: number }> {
  const wrapped = {
    v: SAFE_NOTES_PAYLOAD_VERSION,
    kind: 'nota' as const,
    content: serializePsychatArchivePayload(payload),
    mood: 'neutral',
    tags: [] as string[],
  }
  return encryptSafeNotesPayload(key, aad, wrapped)
}

export async function decryptPsychatArchivePayload(
  key: CryptoKey,
  aad: DataKeyAadInput | string,
  ciphertextB64: string,
  ivB64: string
): Promise<PsychatArchivePayload> {
  const inner = await decryptSafeNotesPayload(key, aad, ciphertextB64, ivB64)
  return parsePsychatArchivePayload(inner.content)
}

export { PSYCHAT_ARCHIVE_KEY_VERSION }
