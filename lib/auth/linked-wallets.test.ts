import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeLinkedWalletAddress } from './linked-wallets'

describe('normalizeLinkedWalletAddress', () => {
  it('normalizes to lowercase checksummed storage form', () => {
    const mixed = '0xd0563bba8e42b6ab0ecdfc1f0ea1486c5c28ba3b'
    assert.equal(
      normalizeLinkedWalletAddress(mixed),
      '0xd0563bba8e42b6ab0ecdfc1f0ea1486c5c28ba3b'
    )
  })

  it('rejects invalid address', () => {
    assert.throws(() => normalizeLinkedWalletAddress('not-an-address'))
  })
})