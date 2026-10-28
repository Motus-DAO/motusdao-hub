import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SESSION_IDLE_MAX_SECONDS } from './constants'
import { isSessionIdleExpired } from './session'

describe('clinical session idle policy', () => {
  it('expires after the idle window', () => {
    const now = 1_700_000_000
    const lastActive = now - SESSION_IDLE_MAX_SECONDS - 1
    assert.equal(isSessionIdleExpired(lastActive, now), true)
    assert.equal(isSessionIdleExpired(now - 60, now), false)
  })
})
