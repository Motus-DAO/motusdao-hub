import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  deriveAccountDataAesKey,
  deriveSafeNotesAesKeyFromSignature,
} from '@/lib/safe-notes/crypto'
import { resolveMigrationCryptoKeys } from './migrate-client'

describe('resolveMigrationCryptoKeys', () => {
  it('wallet → account uses signature key then account-derived key', async () => {
    const walletKey = await deriveSafeNotesAesKeyFromSignature(`0x${'ab'.repeat(65)}`)
    const { fromKey, toKey } = await resolveMigrationCryptoKeys({
      userId: 'cluser123456789',
      fromMode: 'wallet',
      targetMode: 'account',
      walletSignatureKey: walletKey,
    })
    assert.equal(fromKey, walletKey)
    assert.notEqual(toKey, walletKey)
    const { encryptSafeNotesPayload, decryptSafeNotesPayload } = await import(
      '@/lib/safe-notes/crypto'
    )
    const userId = 'cluser123456789'
    const sample = { v: 1 as const, kind: 'nota' as const, content: 'hola', mood: 'neutral', tags: [] }
    const encrypted = await encryptSafeNotesPayload(toKey, { mode: 'account', userId }, sample)
    const accountCheck = await deriveAccountDataAesKey(userId)
    const opened = await decryptSafeNotesPayload(
      accountCheck,
      { mode: 'account', userId },
      encrypted.ciphertext,
      encrypted.iv
    )
    assert.equal(opened.content, 'hola')
    assert.equal(encrypted.keyVersion, 2)
  })
})