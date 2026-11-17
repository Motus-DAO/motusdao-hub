import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getAddress } from 'viem'
import {
  assertSessionWalletConnected,
  authProviderPaymentLabel,
  buildSessionPaymentContext,
  resolvePaymentEip1193Provider,
  sessionWalletMatches,
} from './payment-session'

describe('payment session (I7)', () => {
  const WAAP = { request: async () => {} }
  const THIRDWEB = { request: async () => {} }
  const EOA_A = getAddress('0x1111111111111111111111111111111111111111')
  const EOA_B = getAddress('0x2222222222222222222222222222222222222222')

  it('authProviderPaymentLabel', () => {
    assert.equal(authProviderPaymentLabel('thirdweb'), 'Thirdweb')
    assert.equal(authProviderPaymentLabel('waap'), 'Human')
    assert.equal(authProviderPaymentLabel(null), 'Human')
  })

  it('sessionWalletMatches compares normalized addresses', () => {
    assert.equal(sessionWalletMatches(EOA_A, EOA_A), true)
    assert.equal(sessionWalletMatches(EOA_A, EOA_B), false)
  })

  it('resolvePaymentEip1193Provider branches waap vs thirdweb', () => {
    assert.equal(
      resolvePaymentEip1193Provider('waap', WAAP, null),
      WAAP
    )
    assert.equal(
      resolvePaymentEip1193Provider('thirdweb', WAAP, THIRDWEB),
      THIRDWEB
    )
    assert.throws(() =>
      resolvePaymentEip1193Provider('thirdweb', WAAP, null)
    )
  })

  it('buildSessionPaymentContext binds session eoa + provider', () => {
    const ctx = buildSessionPaymentContext({
      sessionEoa: EOA_A,
      sessionAuthProvider: 'thirdweb',
      connectedEoa: EOA_A,
      waapBridgeProvider: WAAP,
      thirdwebEip1193: THIRDWEB,
    })
    assert.equal(ctx.authProvider, 'thirdweb')
    assert.equal(ctx.eip1193Provider, THIRDWEB)
    assert.equal(ctx.address.toLowerCase(), EOA_A.toLowerCase())
  })

  it('assertSessionWalletConnected rejects mismatch (no pay-from-B while session A)', () => {
    assert.throws(() => {
      assertSessionWalletConnected(EOA_A, EOA_B)
    })
  })
})