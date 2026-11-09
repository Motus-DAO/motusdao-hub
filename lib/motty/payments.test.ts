import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isValidTransferAmount,
  mxnPerUsd,
  normalizeTransferToken,
  quoteTherapy,
} from './payments'
import { enabledMottyToolNames } from './tools'
import { therapyEscrowId } from '@/lib/escrow/create'

function withEnv(name: string, value: string, run: () => void) {
  const previous = process.env[name]
  process.env[name] = value
  try {
    run()
  } finally {
    if (previous === undefined) delete process.env[name]
    else process.env[name] = previous
  }
}

test('quoteTherapy uses the platform price and the configured rate', () => {
  withEnv('NEXT_PUBLIC_THERAPY_TEST_PRICE_WMXN', '', () => {
    withEnv('MOTUS_MXN_PER_USD', '18.5', () => {
      const quote = quoteTherapy()
      assert.equal(quote.usd, 45)
      assert.equal(quote.mxn, 832.5)
      assert.equal(quote.rate, 18.5)
      assert.equal(quote.source, 'fixed')
    })
  })
})

test('quoteTherapy uses the local test price when configured', () => {
  withEnv('NEXT_PUBLIC_THERAPY_TEST_PRICE_WMXN', '10', () => {
    const quote = quoteTherapy()
    assert.equal(quote.mxn, 10)
    assert.equal(quote.source, 'test')
  })
})

test('mxnPerUsd falls back when the env is invalid', () => {
  withEnv('MOTUS_MXN_PER_USD', '0', () => assert.equal(mxnPerUsd(), 18.5))
  withEnv('MOTUS_MXN_PER_USD', 'nope', () => assert.equal(mxnPerUsd(), 18.5))
})

test('therapyEscrowId is deterministic and session-specific', () => {
  const a = therapyEscrowId('session-a')
  const b = therapyEscrowId('session-a')
  const c = therapyEscrowId('session-b')
  assert.equal(a, b)
  assert.notEqual(a, c)
  assert.match(a, /^0x[0-9a-f]{64}$/)
})

test('payment tools disappear when MOTTY_PAYMENTS_ENABLED=false', () => {
  withEnv('MOTTY_PAYMENTS_ENABLED', 'false', () => {
    assert.deepEqual(enabledMottyToolNames(), ['searchKnowledge'])
  })
  withEnv('MOTTY_PAYMENTS_ENABLED', 'true', () => {
    assert.ok(enabledMottyToolNames().includes('getMyUpcomingSession'))
    assert.ok(enabledMottyToolNames().includes('createTherapyEscrowForMySession'))
  })
})


test('transfer token and amount validation', () => {
  assert.equal(normalizeTransferToken('WMXN'), 'wMXN')
  assert.equal(normalizeTransferToken('mxn'), 'wMXN')
  assert.equal(normalizeTransferToken('usdt'), 'USDT')
  assert.equal(normalizeTransferToken('celo'), 'CELO')
  assert.equal(normalizeTransferToken('btc'), null)
  assert.equal(isValidTransferAmount('5'), true)
  assert.equal(isValidTransferAmount('12.50'), true)
  assert.equal(isValidTransferAmount('0'), false)
  assert.equal(isValidTransferAmount('nope'), false)
})

test('prepareTransfer is enabled with the payment tools', () => {
  withEnv('MOTTY_PAYMENTS_ENABLED', 'true', () => {
    assert.ok(enabledMottyToolNames().includes('prepareTransfer'))
  })
})


test('availability and booking tools are enabled with payments', () => {
  withEnv('MOTTY_PAYMENTS_ENABLED', 'true', () => {
    const names = enabledMottyToolNames()
    assert.ok(names.includes('getMyTherapistAvailability'))
    assert.ok(names.includes('bookTherapySession'))
  })
})
