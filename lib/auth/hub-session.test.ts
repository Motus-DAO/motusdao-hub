import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyProfileLoadError,
  profileLoadErrorMessage,
  resolveProfileSessionAccess,
  runHubSessionBootstrap,
  shouldBootstrapHubSession,
  shouldShowCompleteRegistration,
  UNLINKED_WALLET_CODE,
} from './hub-session'
import {
  decideOnboardingIdentity,
  shouldMutateUserOnOnboarding,
} from '../onboarding-identity'

const ORIGINAL_EOA = '0x1111111111111111111111111111111111111111'
const OTHER_EOA = '0x2222222222222222222222222222222222222222'

describe('Hub session + /perfil auth', () => {
  it('WaaP authenticated + no motus_session → auto-bootstrap succeeds', async () => {
    let establishCalls = 0
    const result = await runHubSessionBootstrap({
      walletReady: true,
      walletAuthenticated: true,
      currentEoa: ORIGINAL_EOA,
      session: null,
      establish: async () => {
        establishCalls += 1
        return true
      },
    })

    assert.equal(shouldBootstrapHubSession({
      walletReady: true,
      walletAuthenticated: true,
      currentEoa: ORIGINAL_EOA,
      session: null,
    }), true)
    assert.equal(result, 'bootstrapped')
    assert.equal(establishCalls, 1)
  })

  it('Valid Hub session → /perfil loads normally (no bootstrap, session.userId access)', async () => {
    let establishCalls = 0
    const session = {
      authenticated: true,
      userId: 'user_admin',
      eoaAddress: ORIGINAL_EOA,
    }

    const result = await runHubSessionBootstrap({
      walletReady: true,
      walletAuthenticated: true,
      currentEoa: ORIGINAL_EOA,
      session,
      establish: async () => {
        establishCalls += 1
        return true
      },
    })

    assert.equal(result, 'ready')
    assert.equal(establishCalls, 0)
    assert.deepEqual(resolveProfileSessionAccess(session), {
      status: 'ok',
      userId: 'user_admin',
    })
    assert.equal(shouldShowCompleteRegistration('not_found'), true)
  })

  it('Different wallet → 401/unlinked, never registration CTA', () => {
    const unlinkedSession = {
      authenticated: true,
      userId: null,
      eoaAddress: OTHER_EOA,
    }

    assert.equal(
      shouldBootstrapHubSession({
        walletReady: true,
        walletAuthenticated: true,
        currentEoa: OTHER_EOA,
        session: unlinkedSession,
      }),
      false
    )

    assert.deepEqual(resolveProfileSessionAccess(unlinkedSession), {
      status: 'unlinked',
    })

    const kind = classifyProfileLoadError(401, UNLINKED_WALLET_CODE)
    assert.equal(kind, 'unlinked')
    assert.equal(shouldShowCompleteRegistration(kind), false)
    assert.equal(
      profileLoadErrorMessage(kind).includes('Completar Registro'),
      false
    )
    assert.match(profileLoadErrorMessage(kind), /misma wallet/i)
    assert.doesNotMatch(profileLoadErrorMessage(kind), /0xd0563/i)

    const rebind = decideOnboardingIdentity({
      email: 'member@example.com',
      normalizedEoa: OTHER_EOA,
      userByEmail: {
        id: 'user_completed',
        email: 'member@example.com',
        eoaAddress: ORIGINAL_EOA,
        registrationCompleted: true,
      },
      userByEoa: null,
    })
    assert.equal(rebind.status, 'already_registered')
    assert.equal(shouldMutateUserOnOnboarding(rebind), false)
  })
})
