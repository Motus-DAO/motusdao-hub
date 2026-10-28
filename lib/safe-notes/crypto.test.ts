import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  decryptSafeNotesPayload,
  deriveSafeNotesAesKeyFromSignature,
  encryptSafeNotesPayload,
} from './crypto'
import { SAFE_NOTES_PAYLOAD_VERSION } from './constants'

describe('safe-notes crypto', () => {
  it('derives a stable AES key from a normalized signature', async () => {
    const sig =
      '0x' +
      '11'.repeat(32) +
      '22'.repeat(32) +
      '1b'.repeat(1)
    const key = await deriveSafeNotesAesKeyFromSignature(sig)
    const eoa = '0x1111111111111111111111111111111111111111'
    const payload = {
      v: SAFE_NOTES_PAYLOAD_VERSION as 1,
      content: 'estable',
      mood: 'neutral',
      tags: [] as string[],
    }
    const a = await encryptSafeNotesPayload(key, eoa, payload)
    const b = await encryptSafeNotesPayload(key, eoa, payload)
    assert.notEqual(a.iv, b.iv)
    const openedA = await decryptSafeNotesPayload(key, eoa, a.ciphertext, a.iv)
    const openedB = await decryptSafeNotesPayload(key, eoa, b.ciphertext, b.iv)
    assert.deepEqual(openedA, payload)
    assert.deepEqual(openedB, payload)
  })

  it('encrypts and decrypts with AAD bound to the wallet', async () => {
    const sig = '0x' + 'ab'.repeat(65)
    const key = await deriveSafeNotesAesKeyFromSignature(sig)
    const eoa = '0xAbCdEf0123456789012345678901234567890AbCd'
    const payload = {
      v: SAFE_NOTES_PAYLOAD_VERSION as 1,
      content: 'solo yo leo esto',
      mood: 'calm',
      tags: ['prueba'],
    }
    const stored = await encryptSafeNotesPayload(key, eoa, payload)
    assert.equal(stored.keyVersion, 1)
    assert.ok(!stored.ciphertext.includes('solo yo'))

    const opened = await decryptSafeNotesPayload(
      key,
      eoa,
      stored.ciphertext,
      stored.iv
    )
    assert.deepEqual(opened, payload)
  })

  it('fails decryption when AAD wallet differs', async () => {
    const sig = '0x' + 'cd'.repeat(65)
    const key = await deriveSafeNotesAesKeyFromSignature(sig)
    const stored = await encryptSafeNotesPayload(key, '0x1111111111111111111111111111111111111111', {
      v: SAFE_NOTES_PAYLOAD_VERSION as 1,
      content: 'secreto',
      mood: 'neutral',
      tags: [],
    })
    await assert.rejects(() =>
      decryptSafeNotesPayload(
        key,
        '0x2222222222222222222222222222222222222222',
        stored.ciphertext,
        stored.iv
      )
    )
  })
})
