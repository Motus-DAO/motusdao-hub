import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { foundingTierForPosition } from './tier'

describe('foundingTierForPosition', () => {
  it('assigns tier A for positions 1-10', () => {
    assert.deepEqual(foundingTierForPosition(1), { tier: 'A', discountPercent: 50 })
    assert.deepEqual(foundingTierForPosition(10), { tier: 'A', discountPercent: 50 })
  })

  it('assigns tier B for positions 11-30', () => {
    assert.deepEqual(foundingTierForPosition(11), { tier: 'B', discountPercent: 30 })
    assert.deepEqual(foundingTierForPosition(30), { tier: 'B', discountPercent: 30 })
  })

  it('assigns tier C beyond 30', () => {
    assert.deepEqual(foundingTierForPosition(31), { tier: 'C', discountPercent: 10 })
    assert.deepEqual(foundingTierForPosition(100), { tier: 'C', discountPercent: 10 })
  })
})