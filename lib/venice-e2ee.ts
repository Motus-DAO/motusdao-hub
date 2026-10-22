import { gcm } from '@noble/ciphers/aes.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js'
import { PSYCHAT_SYSTEM_PROMPT } from '@/lib/psychat-prompt'

const HKDF_INFO = utf8ToBytes('ecdsa_encryption')

export type ChatTurn = { role: 'user' | 'assistant'; content: string }
export type RelayMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export function normalizeUncompressedKey(hex: string) {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex
  if (cleaned.length === 130 && cleaned.startsWith('04')) return cleaned.toLowerCase()
  if (cleaned.length === 128 && /^[0-9a-fA-F]+$/.test(cleaned)) return `04${cleaned.toLowerCase()}`
  throw new Error('Clave del enclave inválida.')
}

export function isValidEncrypted(value: string) {
  return value.length >= 186 && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value)
}

export function generateSessionKey() {
  const privateKey = secp256k1.utils.randomSecretKey()
  const publicKeyHex = bytesToHex(secp256k1.getPublicKey(privateKey, false))
  return { privateKey, publicKeyHex }
}

function sharedX(privateKey: Uint8Array, publicKeyHex: string) {
  const point = secp256k1.getSharedSecret(privateKey, hexToBytes(normalizeUncompressedKey(publicKeyHex)), false)
  return point.slice(1, 33)
}

export function encryptMessage(plaintext: string, modelPublicKeyHex: string) {
  const ephemeral = secp256k1.utils.randomSecretKey()
  const aesKey = hkdf(sha256, sharedX(ephemeral, modelPublicKeyHex), undefined, HKDF_INFO, 32)
  const nonce = randomBytes(12)
  const encrypted = gcm(aesKey, nonce).encrypt(utf8ToBytes(plaintext))
  const ephemeralPublic = secp256k1.getPublicKey(ephemeral, false)
  const result = new Uint8Array(65 + 12 + encrypted.length)
  result.set(ephemeralPublic, 0)
  result.set(nonce, 65)
  result.set(encrypted, 77)
  ephemeral.fill(0)
  return bytesToHex(result)
}

export function decryptChunk(ciphertextHex: string, recipientPrivateKey: Uint8Array) {
  if (!isValidEncrypted(ciphertextHex)) throw new Error('La respuesta cifrada no tiene el formato esperado.')
  const raw = hexToBytes(ciphertextHex)
  const serverEphemeral = bytesToHex(raw.slice(0, 65))
  const nonce = raw.slice(65, 77)
  const ciphertext = raw.slice(77)
  const aesKey = hkdf(sha256, sharedX(recipientPrivateKey, serverEphemeral), undefined, HKDF_INFO, 32)
  const plaintext = gcm(aesKey, nonce).decrypt(ciphertext)
  return new TextDecoder().decode(plaintext)
}

export function encryptConversation(turns: ChatTurn[], modelPublicKeyHex: string): RelayMessage[] {
  const dialogue = turns
    .filter((turn) => (turn.role === 'user' || turn.role === 'assistant') && turn.content.trim())
    .map((turn) => `${turn.role === 'user' ? 'Usuario' : 'Asistente'}: ${turn.content.trim()}`)
    .join('\n\n')
  return [
    { role: 'system', content: encryptMessage(PSYCHAT_SYSTEM_PROMPT, modelPublicKeyHex) },
    { role: 'user', content: encryptMessage(dialogue || 'Usuario:', modelPublicKeyHex) },
  ]
}

export function assertAttestation(attestation: {
  verified?: boolean
  nonce?: string
  debug?: boolean
  signing_key?: string
  signing_public_key?: string
}, nonce: string) {
  if (attestation.verified !== true) throw new Error('La prueba del enclave no pasó.')
  if (attestation.nonce !== nonce) throw new Error('La prueba del enclave no coincide con este envío.')
  if (attestation.debug === true) throw new Error('El enclave está en modo de depuración.')
  const signingKey = attestation.signing_key || attestation.signing_public_key
  if (!signingKey) throw new Error('El enclave no entregó una clave.')
  return normalizeUncompressedKey(signingKey)
}

export function assertRelayMessages(messages: RelayMessage[]) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Falta el mensaje cifrado.')
  }
  for (const message of messages) {
    if (
      (message.role !== 'system' && message.role !== 'user' && message.role !== 'assistant') ||
      !isValidEncrypted(message.content)
    ) {
      throw new Error('El mensaje no va cifrado.')
    }
  }
}

export async function readDecryptedStream(body: ReadableStream<Uint8Array>, privateKey: Uint8Array) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let pending = ''
  let full = ''

  const flushPending = () => {
    if (!pending) return
    full += decryptChunk(pending, privateKey)
    pending = ''
  }

  const take = (content: string) => {
    if (/^[0-9a-fA-F]+$/.test(content)) {
      pending += content
      if (!isValidEncrypted(pending)) return
      try {
        full += decryptChunk(pending, privateKey)
        pending = ''
      } catch {
        // A short hex piece can arrive split across SSE chunks.
      }
      return
    }
    flushPending()
    full += content
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const chunk = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }>
        }
        const content = chunk.choices?.[0]?.delta?.content
        const reasoning = chunk.choices?.[0]?.delta?.reasoning_content
        if (typeof content === 'string' && content) take(content)
        else if (typeof reasoning === 'string' && reasoning) take(reasoning)
      } catch {
        // Ignore a partial JSON line. The buffer keeps the next piece.
      }
    }
  }

  flushPending()
  return full
}

export async function sendEncryptedPsychat(turns: ChatTurn[]) {
  const session = generateSessionKey()
  try {
    const nonce = bytesToHex(randomBytes(32))
    const attestationResponse = await fetch('/api/ai/e2ee/attestation', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonce }),
    })
    const attestation = await attestationResponse.json().catch(() => ({}))
    if (!attestationResponse.ok) {
      throw new Error(typeof attestation.error === 'string' ? attestation.error : 'No se pudo comprobar el enclave.')
    }
    const modelKey = assertAttestation(attestation, nonce)
    const chatResponse = await fetch('/api/ai/e2ee/chat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: encryptConversation(turns, modelKey),
        clientPublicKey: session.publicKeyHex,
        modelPublicKey: modelKey,
      }),
    })
    if (!chatResponse.ok || !chatResponse.body) {
      const failure = await chatResponse.json().catch(() => ({}))
      throw new Error(typeof failure.error === 'string' ? failure.error : 'No se pudo enviar el mensaje cifrado.')
    }
    const text = await readDecryptedStream(chatResponse.body, session.privateKey)
    if (!text.trim()) throw new Error('La respuesta cifrada llegó vacía.')
    return text
  } finally {
    session.privateKey.fill(0)
  }
}
