import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CELO_STABLE_TOKENS } from '../celo'
import {
  fetchBlockscoutHistory,
  normalizeBlockscoutHistory,
  type OnchainHistoryItem,
} from './history'

const OWNER = '0xd0563bba8e42b6ab0ecdfc1f0ea1486c5c28ba3b'
const OTHER = '0x045c30e3d67a1e11c392bbd8429bff4ce32f721e'
const RIPIO = '0x9999999999999999999999999999999999999999'
const WMXN = CELO_STABLE_TOKENS.wMXN
const WARS = CELO_STABLE_TOKENS.wARS
const USDT = CELO_STABLE_TOKENS.USDT

function tokenTx(overrides: Record<string, unknown> = {}) {
  return {
    hash: '0xaaa',
    from: RIPIO,
    to: OWNER,
    value: '10000000000000000000', // 10 wMXN
    contractAddress: WMXN,
    timeStamp: '1794093000',
    txreceipt_status: '1',
    ...overrides,
  }
}

function nativeTx(overrides: Record<string, unknown> = {}) {
  return {
    hash: '0xbbb',
    from: OWNER,
    to: OTHER,
    value: '1000000000000000000', // 1 CELO
    timeStamp: '1794092000',
    txreceipt_status: '1',
    ...overrides,
  }
}

function byHash(items: OnchainHistoryItem[], hash: string) {
  return items.find((item) => item.txHash === hash)
}

describe('normalizeBlockscoutHistory', () => {
  it('maps a received wFIAT deposit with 18 decimals', () => {
    const items = normalizeBlockscoutHistory({ address: OWNER, tokentx: [tokenTx()] })
    const item = byHash(items, '0xaaa')

    assert.ok(item)
    assert.equal(item.direction, 'received')
    assert.equal(item.symbol, 'wMXN')
    assert.equal(item.amount, '10')
    assert.equal(item.decimals, 18)
    assert.equal(item.tokenAddress, WMXN.toLowerCase())
    assert.equal(item.status, 'confirmed')
    assert.equal(item.timestamp, 1794093000 * 1000)
    assert.equal(item.explorerUrl, 'https://celoscan.io/tx/0xaaa')
  })

  it('maps a sent token with the right decimals (USDT is 6)', () => {
    const items = normalizeBlockscoutHistory({
      address: OWNER,
      tokentx: [
        tokenTx({
          hash: '0xccc',
          from: OWNER,
          to: OTHER,
          contractAddress: USDT,
          value: '1500000',
        }),
      ],
    })
    const item = byHash(items, '0xccc')

    assert.ok(item)
    assert.equal(item.direction, 'sent')
    assert.equal(item.symbol, 'USDT')
    assert.equal(item.amount, '1.5')
    assert.equal(item.decimals, 6)
  })

  it('drops unknown ERC-20 contracts (spam airdrops)', () => {
    const items = normalizeBlockscoutHistory({
      address: OWNER,
      tokentx: [
        tokenTx({ hash: '0xdead', contractAddress: '0x000000000000000000000000000000000000dead' }),
      ],
    })
    assert.equal(items.length, 0)
  })

  it('includes native CELO only when value moved and ignores token-call txs', () => {
    const items = normalizeBlockscoutHistory({
      address: OWNER,
      txlist: [
        nativeTx(),
        nativeTx({ hash: '0xzero', value: '0' }), // ERC-20 call in txlist
      ],
    })

    assert.equal(items.length, 1)
    assert.equal(items[0].symbol, 'CELO')
    assert.equal(items[0].amount, '1')
    assert.equal(items[0].tokenAddress, null)
  })

  it('marks reverted transactions as failed', () => {
    const items = normalizeBlockscoutHistory({
      address: OWNER,
      tokentx: [tokenTx({ hash: '0xfail', txreceipt_status: '0' })],
    })
    assert.equal(items[0].status, 'failed')
  })

  it('skips transfers that do not involve the owner and dedups by hash+token', () => {
    const items = normalizeBlockscoutHistory({
      address: OWNER,
      tokentx: [
        tokenTx({ hash: '0xdup' }),
        tokenTx({ hash: '0xdup' }),
        tokenTx({ hash: '0xnope', from: OTHER, to: OTHER }),
      ],
    })
    assert.equal(items.length, 1)
    assert.equal(items[0].txHash, '0xdup')
  })

  it('sorts newest first across tokens and native', () => {
    const items = normalizeBlockscoutHistory({
      address: OWNER,
      tokentx: [tokenTx({ hash: '0xold', timeStamp: '1000' })],
      txlist: [nativeTx({ hash: '0xnew', timeStamp: '2000' })],
    })
    assert.deepEqual(
      items.map((item) => item.txHash),
      ['0xnew', '0xold']
    )
  })

  it('accepts wARS too', () => {
    const items = normalizeBlockscoutHistory({
      address: OWNER,
      tokentx: [tokenTx({ contractAddress: WARS, value: '2500000000000000000' })],
    })
    assert.equal(items[0].symbol, 'wARS')
    assert.equal(items[0].amount, '2.5')
  })
})

describe('fetchBlockscoutHistory', () => {
  it('combines tokentx and txlist', async () => {
    const calls: string[] = []
    const fakeFetch = (async (url: string) => {
      calls.push(String(url))
      const result = String(url).includes('action=tokentx') ? [tokenTx()] : [nativeTx()]
      return new Response(JSON.stringify({ status: '1', result }), { status: 200 })
    }) as unknown as typeof fetch

    const items = await fetchBlockscoutHistory(OWNER, fakeFetch)

    assert.equal(calls.length, 2)
    assert.deepEqual(
      items.map((item) => item.symbol).sort(),
      ['CELO', 'wMXN']
    )
  })

  it('treats a string result (no transactions) as empty', async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: 'No transactions found' }), {
        status: 200,
      })) as unknown as typeof fetch

    assert.deepEqual(await fetchBlockscoutHistory(OWNER, fakeFetch), [])
  })

  it('throws when Blockscout fails', async () => {
    const fakeFetch = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch

    await assert.rejects(() => fetchBlockscoutHistory(OWNER, fakeFetch), /Blockscout/)
  })
})
