import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { HUB_THIRDWEB_INAPP_AUTH_OPTIONS } from './thirdweb'

describe('HUB_THIRDWEB_INAPP_AUTH_OPTIONS', () => {
  it('includes passkey for Thirdweb in-app connect', () => {
    assert.ok(HUB_THIRDWEB_INAPP_AUTH_OPTIONS.includes('passkey'))
    assert.ok(HUB_THIRDWEB_INAPP_AUTH_OPTIONS.includes('email'))
  })
})