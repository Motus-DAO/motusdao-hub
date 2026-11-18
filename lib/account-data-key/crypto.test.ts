import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  decryptSafeNotesPayload,
  deriveAccountDataAesKey,
  deriveSafeNotesAesKeyFromSignature,
  encryptSafeNotesPayload,
} from '@/lib/safe-notes/crypto'
import { SAFE_NOTES_PAYLOAD_VERSION } from '@/lib/safe-notes/constants'

describe('account data key crypto', () => {
  it('account mode uses message-bound key shared across linked wallets', async () => {
    const userId = 'user_same_account'
    const keyA = await deriveAccountDataAesKey(userId)
    const keyB = await deriveAccountDataAesKey(userId)
    const payload = {
      v: SAFE_NOTES_PAYLOAD_VERSION as 1,
      kind: 'nota' as const,
      content: 'cuenta',
      mood: 'neutral',
      tags: [] as string[],
    }
    const stored = await encryptSafeNotesPayload(keyA, { mode: 'account', userId }, payload)
    assert.equal(stored.keyVersion, 2)
    const opened = await decryptSafeNotesPayload(
      keyA,
      { mode: 'account', userId },
      stored.ciphertext,
      stored.iv
    )
    assert.equal(opened.content, 'cuenta')

    const openedB = await decryptSafeNotesPayload(
      keyB,
      { mode: 'account', userId },
      stored.ciphertext,
      stored.iv
    )
    assert.equal(openedB.content, 'cuenta')
  })

  it('wallet-mode signature keys do not open account-mode blobs', async () => {
    const sigA = '0x' + '11'.repeat(65)
    const walletKey = await deriveSafeNotesAesKeyFromSignature(sigA)
    const accountKey = await deriveAccountDataAesKey('clabc_shared')
    const userId = 'clabc_shared'
    const eoa = '0x1111111111111111111111111111111111111111'
    const stored = await encryptSafeNotesPayload(accountKey, { mode: 'account', userId }, {
      v: SAFE_NOTES_PAYLOAD_VERSION as 1,
      kind: 'nota' as const,
      content: 'multilink',
      mood: 'neutral',
      tags: [],
    })
    await assert.rejects(() =>
      decryptSafeNotesPayload(
        walletKey,
        { mode: 'wallet', eoaAddress: eoa },
        stored.ciphertext,
        stored.iv
      )
    )
  })

  it('wallet mode still rejects wrong EOA AAD', async () => {
    const sig = '0x' + 'cd'.repeat(65)
    const key = await deriveSafeNotesAesKeyFromSignature(sig)
    const stored = await encryptSafeNotesPayload(
      key,
      { mode: 'wallet', eoaAddress: '0x1111111111111111111111111111111111111111' },
      {
        v: SAFE_NOTES_PAYLOAD_VERSION as 1,
        kind: 'nota' as const,
        content: 'solo eoa',
        mood: 'neutral',
        tags: [],
      }
    )
    assert.equal(stored.keyVersion, 1)
    await assert.rejects(() =>
      decryptSafeNotesPayload(
        key,
        { mode: 'wallet', eoaAddress: '0x2222222222222222222222222222222222222222' },
        stored.ciphertext,
        stored.iv
      )
    )
  })
})