import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getDefaultLoginProvider,
  resolveConnectRoute,
  shouldPreemptWaapWithThirdweb,
} from './safari-connect-route'

describe('safari-connect-route', () => {
  it('resolveConnectRoute labels', () => {
    assert.equal(resolveConnectRoute('waap', false), 'waap')
    assert.equal(resolveConnectRoute('thirdweb', true), 'thirdweb_manual_fallback')
    assert.equal(resolveConnectRoute('thirdweb', false), 'thirdweb_modal_choice')
  })

  it('default provider is waap when not iOS Safari', () => {
    assert.equal(getDefaultLoginProvider(), 'waap')
    assert.equal(shouldPreemptWaapWithThirdweb(), false)
  })
})