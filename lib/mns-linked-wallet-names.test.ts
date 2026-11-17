import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { dedupeAddresses, normalizeMotusLabel } from '@/lib/mns-linked-wallet-names'

describe('mns-linked-wallet-names', () => {
  it('normalizeMotusLabel strips suffix', () => {
    assert.equal(normalizeMotusLabel('ana.motus'), 'ana')
    assert.equal(normalizeMotusLabel('ANA.MOTUS'), 'ANA')
  })

  it('dedupeAddresses is case-insensitive', () => {
    const a = '0xAbC0000000000000000000000000000000000001'
    const b = '0xabc0000000000000000000000000000000000001'
    assert.deepEqual(dedupeAddresses([a, b, a]), [a])
  })
})