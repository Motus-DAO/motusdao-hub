import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type Stripe from 'stripe'
import {
  applicationFeeCents,
  cancellationRefundAllowed,
  connectAccountSessionComponents,
  mapV2AccountStatus,
  stripeCountryCode,
} from './stripe-connect'
import {
  CONNECT_PATHS,
  CONNECT_SITE_LINKS,
  connectSectionHref,
  isValidStripeAccountId,
} from './stripe-connect-paths'

describe('therapy connect pricing', () => {
  it('keeps 10 percent of a 45 USD session as the platform fee', () => {
    assert.equal(applicationFeeCents(4500, 1000), 450)
  })

  it('never takes the whole charge as a fee', () => {
    assert.equal(applicationFeeCents(100, 10000), 99)
  })

  it('refunds when the session is still 48 hours away', () => {
    const now = new Date('2026-10-23T12:00:00.000Z')
    const start = new Date('2026-10-25T12:00:00.000Z')
    assert.equal(cancellationRefundAllowed(start, now), true)
  })

  it('keeps the payment when the session is inside the notice window', () => {
    const now = new Date('2026-10-23T12:00:00.000Z')
    const start = new Date('2026-10-25T11:00:00.000Z')
    assert.equal(cancellationRefundAllowed(start, now), false)
  })

  it('maps the profile country to a Stripe country code', () => {
    assert.equal(stripeCountryCode('mexico'), 'MX')
    assert.equal(stripeCountryCode('España'), 'ES')
    assert.equal(stripeCountryCode('otros'), null)
  })
})

describe('accounts v2 status mapping', () => {
  it('enables charging when card payments and payouts are active', () => {
    const account = {
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { status: 'active' },
            stripe_balance: { payouts: { status: 'active' } },
          },
        },
      },
      requirements: { summary: { minimum_deadline: { status: 'eventually_due' } } },
    } as unknown as Stripe.V2.Core.Account

    const status = mapV2AccountStatus(account)
    assert.equal(status.chargesEnabled, true)
    assert.equal(status.payoutsEnabled, true)
    assert.equal(status.requirementsDue, false)
    assert.equal(status.onboardingComplete, true)
  })

  it('marks currently due requirements as pending onboarding', () => {
    const account = {
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { status: 'restricted' },
          },
        },
      },
      requirements: { summary: { minimum_deadline: { status: 'currently_due' } } },
    } as unknown as Stripe.V2.Core.Account

    const status = mapV2AccountStatus(account)
    assert.equal(status.chargesEnabled, false)
    assert.equal(status.payoutsEnabled, false)
    assert.equal(status.requirementsDue, true)
    assert.equal(status.onboardingComplete, false)
  })

  it('treats an account without configuration as not enabled', () => {
    const status = mapV2AccountStatus({} as Stripe.V2.Core.Account)
    assert.equal(status.chargesEnabled, false)
    assert.equal(status.payoutsEnabled, false)
    assert.equal(status.requirementsDue, false)
    assert.equal(status.onboardingComplete, true)
  })
})

describe('embedded components', () => {
  it('enables the components Stripe requires when it bears losses and collects fees', () => {
    const components = connectAccountSessionComponents()

    assert.equal(components.account_management?.enabled, true)
    assert.equal(components.notification_banner?.enabled, true)
    assert.equal(components.documents?.enabled, true)
    assert.equal(components.payments?.enabled, true)
    assert.equal(components.payouts?.enabled, true)
    assert.equal(components.balances?.enabled, true)
  })

  it('keeps bank account collection enabled for account management', () => {
    const components = connectAccountSessionComponents()
    assert.equal(components.account_management?.features?.external_account_collection, true)
    assert.equal(components.payouts?.features?.edit_payout_schedule, true)
  })

  it('registers one distinct site link per component page', () => {
    assert.equal(CONNECT_SITE_LINKS.notification_banner, CONNECT_PATHS.home)
    assert.equal(CONNECT_SITE_LINKS.account_management, CONNECT_PATHS.account)

    const pages = Object.values(CONNECT_SITE_LINKS)
    assert.equal(new Set(pages).size, pages.length)
    assert.ok(pages.every((path) => path.startsWith('/cobros')))
  })
})

describe('connected account links', () => {
  it('accepts Stripe account ids only', () => {
    assert.equal(isValidStripeAccountId('acct_1TnbVgBffEqB2M2K'), true)
    assert.equal(isValidStripeAccountId('acct_'), false)
    assert.equal(isValidStripeAccountId('acct_123&redirect=https://evil.test'), false)
    assert.equal(isValidStripeAccountId('cus_123'), false)
    assert.equal(isValidStripeAccountId(undefined), false)
  })

  it('carries the connected account into internal dashboard links', () => {
    assert.equal(connectSectionHref('payments'), '/cobros/pagos')
    assert.equal(
      connectSectionHref('payments', 'acct_1TnbVgBffEqB2M2K'),
      '/cobros/pagos?stripe_account_id=acct_1TnbVgBffEqB2M2K'
    )
  })
})
