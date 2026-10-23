import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  decideOnboardingIdentity,
  sessionMatchesOnboardingWallet,
  shouldMutateUserOnOnboarding,
} from './onboarding-identity'
import { psmConsentRejection, userConsentRejection } from './onboarding-consent'
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

describe('Onboarding wallet session', () => {
  it('accepts the same wallet and rejects another', () => {
    assert.equal(
      sessionMatchesOnboardingWallet(
        '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      ),
      true
    )
    assert.equal(sessionMatchesOnboardingWallet(ORIGINAL_EOA, OTHER_EOA), false)
    assert.equal(sessionMatchesOnboardingWallet(ORIGINAL_EOA, 'not-a-wallet'), false)
  })

  it('treats omitted consents as a rejected signup', () => {
    const omitted = {
      consentToTerms: false,
      consentToPrivacy: false,
      consentToShareWithPSM: false,
      consentToClinicalMatching: false,
    }
    assert.equal(userConsentRejection({ intakeTrack: 'therapy', ...omitted }), 'Faltan los consentimientos de términos y privacidad.')
    assert.equal(
      userConsentRejection({
        intakeTrack: 'therapy',
        ...omitted,
        consentToTerms: true,
        consentToPrivacy: true,
      }),
      'Faltan los consentimientos para compartir el perfil y el matching.'
    )
    assert.equal(
      userConsentRejection({
        intakeTrack: 'platform',
        ...omitted,
        consentToTerms: true,
        consentToPrivacy: true,
      }),
      null
    )
    assert.equal(psmConsentRejection(omitted), 'Faltan los consentimientos de términos y privacidad.')
    assert.equal(psmConsentRejection({ consentToTerms: true, consentToPrivacy: true }), null)
  })
})
