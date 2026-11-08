import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { OnchainHistoryItem } from '../onchain/history'
import { mergeActivity } from './activity'

function onchain(overrides: Partial<OnchainHistoryItem> = {}): OnchainHistoryItem {
  const base: OnchainHistoryItem = {
    txHash: '0xabc',
    direction: 'received',
    symbol: 'wMXN',
    amount: '50',
    rawAmount: '50000000000000000000',
    decimals: 18,
    from: '0x9999999999999999999999999999999999999999',
    to: '0xd0563bba8e42b6ab0ecdfc1f0ea1486c5c28ba3b',
    timestamp: 1000,
    status: 'confirmed',
    tokenAddress: '0x337e7456b420bd3481e7fa61fa9850343d610d34',
    explorerUrl: 'https://celoscan.io/tx/0xabc',
  }

  const merged = { ...base, ...overrides }
  return {
    ...merged,
    explorerUrl: overrides.explorerUrl ?? `https://celoscan.io/tx/${merged.txHash}`,
  }
}

describe('mergeActivity', () => {
  it('maps on-chain movements with direction and explorer link', () => {
    const items = mergeActivity({
      onchain: [
        onchain(),
        onchain({ txHash: '0xdef', direction: 'sent', to: '0x1234567890123456789012345678901234567890', timestamp: 2000 }),
      ],
    })

    assert.equal(items.length, 2)
    assert.equal(items[0].kind, 'onchain_sent')
    assert.equal(items[0].title, 'Enviaste 50 wMXN')
    assert.equal(items[0].explorerUrl, 'https://celoscan.io/tx/0xdef')
    assert.equal(items[1].kind, 'onchain_received')
    assert.equal(items[1].title, 'Recibiste 50 wMXN')
  })

  it('maps a card session with the hold amount in USD cents', () => {
    const items = mergeActivity({
      card: [
        {
          sessionId: 's1',
          paidAt: new Date(5_000),
          refundedAt: null,
          amountCents: 4500,
          psmLabel: 'PSM Ana',
        },
      ],
    })

    assert.equal(items[0].kind, 'therapy_card')
    assert.equal(items[0].amount, '45.00')
    assert.equal(items[0].currency, 'USD')
    assert.equal(items[0].subtitle, 'Con PSM Ana')
    assert.equal(items[0].status, 'confirmed')
  })

  it('marks a refunded session as refunded', () => {
    const items = mergeActivity({
      card: [
        {
          sessionId: 's1',
          paidAt: new Date(5_000),
          refundedAt: new Date(6_000),
          amountCents: 4500,
        },
      ],
    })
    assert.equal(items[0].status, 'refunded')
    assert.match(items[0].title, /reembolsada/)
  })

  it('does not duplicate a session paid by card and reported by SPEI', () => {
    const items = mergeActivity({
      card: [
        { sessionId: 's1', paidAt: new Date(5_000), refundedAt: null, amountCents: 4500 },
      ],
      spei: [
        { sessionId: 's1', amount: '900', currency: 'MXN', createdAt: new Date(4_000) },
        { sessionId: 's2', amount: '900', currency: 'MXN', createdAt: new Date(3_000) },
      ],
    })

    assert.equal(items.length, 2)
    assert.equal(items.filter((item) => item.kind === 'therapy_spei').length, 1)
    assert.equal(items.find((item) => item.kind === 'therapy_spei')?.id.startsWith('spei:s2'), true)
  })

  it('maps academy payments and their status', () => {
    const items = mergeActivity({
      academy: [
        { paymentId: 'p1', amount: 25, currency: 'USD', status: 'confirmed', createdAt: new Date(1_000), orderId: 'o1' },
        { paymentId: 'p2', amount: 25, currency: 'USD', status: 'refunded', createdAt: new Date(2_000), orderId: 'o2' },
        { paymentId: 'p3', amount: 25, currency: 'USD', status: 'failed', createdAt: new Date(3_000), orderId: 'o3' },
      ],
    })

    assert.deepEqual(
      items.map((item) => item.status),
      ['failed', 'refunded', 'confirmed']
    )
    assert.equal(items[0].kind, 'academy')
    assert.equal(items[0].href, '/academia')
  })

  it('sorts newest first and honors the limit', () => {
    const items = mergeActivity({
      onchain: [
        onchain({ txHash: '0x1', timestamp: 1000 }),
        onchain({ txHash: '0x2', timestamp: 3000 }),
        onchain({ txHash: '0x3', timestamp: 2000 }),
      ],
      limit: 2,
    })

    assert.equal(items.length, 2)
    assert.deepEqual(
      items.map((item) => item.timestamp),
      [3000, 2000]
    )
  })

  it('trims long on-chain amounts', () => {
    const items = mergeActivity({
      onchain: [onchain({ amount: '0.099990000999900009' })],
    })
    assert.equal(items[0].amount, '0.09999')
  })
})
