import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { TRAINING_COMPENSATION_USD_OPTIONS } from '@/lib/training-copy/constants'

describe('training compensation options', () => {
  it('allows 0, 5, and 10 USD only', () => {
    assert.deepEqual(TRAINING_COMPENSATION_USD_OPTIONS, [0, 5, 10])
  })
})
