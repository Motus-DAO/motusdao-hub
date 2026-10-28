import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  contactPostRateLimited,
  isAllowedPimlicoMethod,
  sessionOwnsSpendAddress,
} from './platform-spend-guard'
import type { AuthContext } from '@/lib/auth/session'

const session: AuthContext = {
  userId: 'user_1',
  eoaAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  role: 'usuario',
  isPlatformAdmin: false,
  authProvider: 'waap',
}

describe('platform spend guard', () => {
  it('allowlists only ERC-4337 and Pimlico paymaster methods', () => {
    assert.equal(isAllowedPimlicoMethod('eth_sendUserOperation'), true)
    assert.equal(isAllowedPimlicoMethod('pm_getPaymasterData'), true)
    assert.equal(isAllowedPimlicoMethod('eth_accounts'), false)
  })

  it('binds spend address to the session wallet', () => {
    assert.equal(
      sessionOwnsSpendAddress(
        session,
        '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
      ),
      true
    )
    assert.equal(
      sessionOwnsSpendAddress(
        session,
        '0x1111111111111111111111111111111111111111'
      ),
      false
    )
  })

  it('rate limits contact posts per client key', () => {
    const key = `test-contact-${Date.now()}`
    for (let i = 0; i < 5; i += 1) {
      assert.equal(contactPostRateLimited(key), false)
    }
    assert.equal(contactPostRateLimited(key), true)
  })
})
