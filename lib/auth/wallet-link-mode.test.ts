import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  endWalletLinkMode,
  isWalletLinkModeActive,
  resetWalletLinkMode,
  startWalletLinkMode,
} from './wallet-link-mode'

describe('wallet-link-mode', () => {
  it('tracks nested link mode', () => {
    resetWalletLinkMode()
    assert.equal(isWalletLinkModeActive(), false)
    startWalletLinkMode()
    assert.equal(isWalletLinkModeActive(), true)
    startWalletLinkMode()
    endWalletLinkMode()
    assert.equal(isWalletLinkModeActive(), true)
    endWalletLinkMode()
    assert.equal(isWalletLinkModeActive(), false)
  })
})