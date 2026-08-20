import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  decideOnboardingIdentity,
  shouldMutateUserOnOnboarding,
} from './onboarding-identity'
import { ALREADY_REGISTERED_CODE } from './auth/hub-session'

const ORIGINAL_EOA = '0x1111111111111111111111111111111111111111'
const OTHER_EOA = '0x2222222222222222222222222222222222222222'

const completedAccount = {
  id: 'user_completed',
  email: 'aszalvarez@example.com',
  eoaAddress: ORIGINAL_EOA,
  registrationCompleted: true,
}

describe('Onboarding identity freeze', () => {
  it('Completed account hitting onboarding → 409, zero user-row mutation', () => {
    const sameWallet = decideOnboardingIdentity({
      email: completedAccount.email,
      normalizedEoa: ORIGINAL_EOA,
      userByEmail: completedAccount,
      userByEoa: completedAccount,
    })

    assert.equal(sameWallet.status, 'already_registered')
    if (sameWallet.status === 'already_registered') {
      assert.equal(sameWallet.code, ALREADY_REGISTERED_CODE)
    }
    assert.equal(shouldMutateUserOnOnboarding(sameWallet), false)
    assert.equal('identitySync' in sameWallet, false)

    const differentWallet = decideOnboardingIdentity({
      email: completedAccount.email,
      normalizedEoa: OTHER_EOA,
      userByEmail: completedAccount,
      userByEoa: null,
    })

    assert.equal(differentWallet.status, 'already_registered')
    assert.equal(shouldMutateUserOnOnboarding(differentWallet), false)
    assert.equal('identitySync' in differentWallet, false)
    if (differentWallet.status === 'already_registered') {
      assert.match(differentWallet.message, /misma wallet/i)
      assert.doesNotMatch(differentWallet.message, /0xd0563/i)
    }
  })

  it('Incomplete account can still bind a first wallet (create/update allowed)', () => {
    const created = decideOnboardingIdentity({
      email: 'new@example.com',
      normalizedEoa: OTHER_EOA,
      userByEmail: null,
      userByEoa: null,
    })
    assert.equal(created.status, 'create')
    assert.equal(shouldMutateUserOnOnboarding(created), true)

    const incomplete = decideOnboardingIdentity({
      email: 'new@example.com',
      normalizedEoa: OTHER_EOA,
      userByEmail: {
        id: 'user_draft',
        email: 'new@example.com',
        eoaAddress: ORIGINAL_EOA,
        registrationCompleted: false,
      },
      userByEoa: null,
    })
    assert.equal(incomplete.status, 'update')
    if (incomplete.status === 'update') {
      assert.equal(incomplete.identitySync.eoaAddress, OTHER_EOA)
    }
    assert.equal(shouldMutateUserOnOnboarding(incomplete), true)
  })
})
