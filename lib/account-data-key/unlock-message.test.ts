import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildAccountDataUnlockMessage } from './unlock-message'
import { ACCOUNT_DATA_KEY_VERSION, ACCOUNT_DATA_PURPOSE } from './constants'

describe('buildAccountDataUnlockMessage', () => {
  it('builds v2 account unlock text without address line', () => {
    const userId = 'clxyz123'
    const message = buildAccountDataUnlockMessage(userId)
    assert.ok(message.includes(`purpose: ${ACCOUNT_DATA_PURPOSE}`))
    assert.ok(message.includes(`keyVersion: ${ACCOUNT_DATA_KEY_VERSION}`))
    assert.ok(message.includes(`userId: ${userId}`))
    assert.ok(!message.includes('address:'))
  })
})