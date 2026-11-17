import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildFoundingPromotionCode, slugCodePart } from './slug'

describe('slugCodePart', () => {
  it('strips accents and non-alphanumeric', () => {
    assert.equal(slugCodePart('Ana Lucía'), 'ANALUCIA')
  })

  it('falls back to USER', () => {
    assert.equal(slugCodePart('!!!'), 'USER')
  })
})

describe('buildFoundingPromotionCode', () => {
  it('formats MTU codes', () => {
    assert.equal(buildFoundingPromotionCode('MTU', 7, 'Ana'), 'MTU-7-ANA')
  })
})