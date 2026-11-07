import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type Stripe from 'stripe'
import {
  applicationFeeCents,
  cancellationRefundAllowed,
  mapV2AccountStatus,
  stripeCountryCode,
} from './stripe-connect'

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
