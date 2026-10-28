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
  eoaAddress: string,
  payload: PsychatArchivePayload
): Promise<{ ciphertext: string; iv: string; keyVersion: number }> {
  const wrapped = {
    v: SAFE_NOTES_PAYLOAD_VERSION,
    content: serializePsychatArchivePayload(payload),
    mood: 'neutral',
    tags: [] as string[],
  }
  return encryptSafeNotesPayload(key, eoaAddress, wrapped)
}

export async function decryptPsychatArchivePayload(
  key: CryptoKey,
  eoaAddress: string,
  ciphertextB64: string,
  ivB64: string
): Promise<PsychatArchivePayload> {
  const inner = await decryptSafeNotesPayload(key, eoaAddress, ciphertextB64, ivB64)
  return parsePsychatArchivePayload(inner.content)
}

export { PSYCHAT_ARCHIVE_KEY_VERSION }
