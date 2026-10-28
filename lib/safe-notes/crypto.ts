import { normalizeSignature } from '@/lib/auth/verify-siwe'
import {
  SAFE_NOTES_GCM_IV_BYTES,
  SAFE_NOTES_KEY_VERSION,
} from './constants'
import {
  parseSafeNotesPayload,
  serializeSafeNotesPayload,
  type SafeNotesPayload,
} from './payload'

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('Web Crypto is not available')
  }
  return subtle
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex
  if (normalized.length % 2 !== 0) {
    throw new Error('Invalid hex signature')
  }
  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'))
  }
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

export async function deriveSafeNotesAesKeyFromSignature(
  signatureHex: string
): Promise<CryptoKey> {
  const sigBytes = hexToBytes(normalizeSignature(signatureHex))
  const hash = await getSubtle().digest('SHA-256', asBufferSource(sigBytes))
  return getSubtle().importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export function safeNotesAad(eoaAddress: string): Uint8Array {
  return new TextEncoder().encode(eoaAddress.toLowerCase())
}

export async function encryptSafeNotesPayload(
  key: CryptoKey,
  eoaAddress: string,
  payload: SafeNotesPayload
): Promise<{ ciphertext: string; iv: string; keyVersion: number }> {
  const iv = crypto.getRandomValues(new Uint8Array(SAFE_NOTES_GCM_IV_BYTES))
  const plain = new TextEncoder().encode(serializeSafeNotesPayload(payload))
  const cipherBuf = await getSubtle().encrypt(
    {
      name: 'AES-GCM',
      iv: asBufferSource(iv),
      additionalData: asBufferSource(safeNotesAad(eoaAddress)),
    },
    key,
    plain
  )
  return {
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
    iv: bytesToBase64(iv),
    keyVersion: SAFE_NOTES_KEY_VERSION,
  }
}

export async function decryptSafeNotesPayload(
  key: CryptoKey,
  eoaAddress: string,
  ciphertextB64: string,
  ivB64: string
): Promise<SafeNotesPayload> {
  const iv = base64ToBytes(ivB64)
  if (iv.length !== SAFE_NOTES_GCM_IV_BYTES) {
    throw new Error('Invalid IV length')
  }
  const cipherBytes = base64ToBytes(ciphertextB64)
  const plainBuf = await getSubtle().decrypt(
    {
      name: 'AES-GCM',
      iv: asBufferSource(iv),
      additionalData: asBufferSource(safeNotesAad(eoaAddress)),
    },
    key,
    asBufferSource(cipherBytes)
  )
  const json = new TextDecoder().decode(plainBuf)
  return parseSafeNotesPayload(json)
}

export function assertValidStoredCiphertext(ciphertext: string, iv: string): void {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Ciphertext is required')
  }
  if (!iv || typeof iv !== 'string') {
    throw new Error('IV is required')
  }
  const ivBytes = base64ToBytes(iv)
  if (ivBytes.length !== SAFE_NOTES_GCM_IV_BYTES) {
    throw new Error('IV must be 12 bytes')
  }
  base64ToBytes(ciphertext)
}
