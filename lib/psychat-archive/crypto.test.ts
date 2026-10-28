import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deriveSafeNotesAesKeyFromSignature } from '@/lib/safe-notes/crypto'
import {
  decryptPsychatArchivePayload,
  derivePsychatArchiveKeyFromSignature,
  encryptPsychatArchivePayload,
} from './crypto'

describe('psychat-archive crypto', () => {
  it('bitácora key cannot decrypt psychat archive blobs', async () => {
    const bitacoraSig = '0x' + 'aa'.repeat(65)
    const psychatSig = '0x' + 'bb'.repeat(65)
    const bitacoraKey = await deriveSafeNotesAesKeyFromSignature(bitacoraSig)
    const psychatKey = await derivePsychatArchiveKeyFromSignature(psychatSig)
    const eoa = '0x1111111111111111111111111111111111111111'

    const stored = await encryptPsychatArchivePayload(psychatKey, eoa, {
      v: 1,
      savedAt: new Date().toISOString(),
      messages: [{ role: 'user', content: 'hola' }],
    })

    const opened = await decryptPsychatArchivePayload(
      psychatKey,
      eoa,
      stored.ciphertext,
      stored.iv
    )
    assert.equal(opened.messages[0]?.content, 'hola')

    await assert.rejects(() =>
      decryptPsychatArchivePayload(bitacoraKey, eoa, stored.ciphertext, stored.iv)
    )
  })

  it('round-trips messages in the inner payload envelope', async () => {
    const sig = '0x' + 'cc'.repeat(65)
    const key = await derivePsychatArchiveKeyFromSignature(sig)
    const eoa = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    const payload = {
      v: 1 as const,
      savedAt: '2026-10-28T00:00:00.000Z',
      messages: [
        { role: 'user' as const, content: 'pregunta' },
        { role: 'assistant' as const, content: 'respuesta' },
      ],
    }
    const stored = await encryptPsychatArchivePayload(key, eoa, payload)
    assert.equal(stored.keyVersion, 1)
    const opened = await decryptPsychatArchivePayload(key, eoa, stored.ciphertext, stored.iv)
    assert.deepEqual(opened, payload)
  })
})
