import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  creditDayStart,
  creditUsedPercent,
  estimateTokens,
  hasRoomForReply,
  inferenceCostUsd,
  outputTokenCap,
  splitCreditCharge,
} from './ai-credit'

describe('ai credit', () => {
  it('prices one million DeepSeek TEE tokens at the catalog rate', () => {
    assert.equal(inferenceCostUsd('e2ee-deepseek-v4-flash', 1_000_000, 0), 0.182)
    assert.equal(inferenceCostUsd('e2ee-deepseek-v4-flash', 0, 1_000_000), 0.373)
  })

  it('resets the day at midnight in Mexico City', () => {
    assert.equal(creditDayStart(new Date('2026-10-22T05:30:00.000Z')).toISOString(), '2026-10-21T06:00:00.000Z')
    assert.equal(creditDayStart(new Date('2026-10-22T06:00:00.000Z')).toISOString(), '2026-10-22T06:00:00.000Z')
  })

  it('shrinks the reply when the remaining balance cannot pay the requested output', () => {
    const cap = outputTokenCap(0.0002, 100, 'e2ee-deepseek-v4-flash', 800)
    assert.ok(cap < 800)
    assert.equal(hasRoomForReply(cap), cap >= 64)
  })

  it('fills the ring with credit already used', () => {
    assert.equal(creditUsedPercent({ remainingUsd: 0.098, allowanceUsd: 0.1 }), 2)
    assert.equal(creditUsedPercent({ remainingUsd: 0.056, allowanceUsd: 0.1 }), 44)
    assert.equal(creditUsedPercent({ remainingUsd: 0.1, allowanceUsd: 0.1 }), 0)
    assert.equal(creditUsedPercent({ remainingUsd: 0, allowanceUsd: 0.1 }), 100)
  })

  it('counts characters toward tokens', () => {
    assert.equal(estimateTokens('a'.repeat(30)), 10)
  })

  it('spends the daily free credit before the purchased balance', () => {
    assert.deepEqual(splitCreditCharge({ spentTodayUsd: 0.09, purchasedUsd: 5, chargeUsd: 0.05 }), {
      freeCoverUsd: 0.01,
      purchasedHoldUsd: 0.04,
    })
  })

  it('uses only the purchased balance after the daily free credit is gone', () => {
    assert.deepEqual(splitCreditCharge({ spentTodayUsd: 0.1, purchasedUsd: 5, chargeUsd: 0.2 }), {
      freeCoverUsd: 0,
      purchasedHoldUsd: 0.2,
    })
  })

  it('refuses a charge the free credit and the balance cannot cover', () => {
    assert.equal(splitCreditCharge({ spentTodayUsd: 0.1, purchasedUsd: 0, chargeUsd: 0.01 }), null)
  })
})
