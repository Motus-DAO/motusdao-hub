import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applicationFeeCents,
  cancellationRefundAllowed,
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
