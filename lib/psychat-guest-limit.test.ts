import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkPsychatGuestLimit,
  consumePsychatGuestMessage,
  resetPsychatGuestLimitsForTests,
} from './psychat-guest-limit'

describe('psychat guest limit', () => {
  it('allows up to 8 messages per key per day', () => {
    resetPsychatGuestLimitsForTests()
    const key = 'guest:test-ip'
    for (let i = 0; i < 8; i++) {
      const before = checkPsychatGuestLimit(key)
      assert.equal(before.allowed, true)
      consumePsychatGuestMessage(key)
    }
    const blocked = checkPsychatGuestLimit(key)
    assert.equal(blocked.allowed, false)
    assert.equal(blocked.remaining, 0)
  })
})