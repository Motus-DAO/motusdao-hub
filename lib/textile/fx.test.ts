import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applySlippageRay,
  fromAtomicAmount,
  indicativeBuyAmount,
  resolveTextilePair,
  tickerIdForWfiat,
  toAtomicAmount,
} from './fx'

describe('Textile FX in-app pair helpers', () => {
  it('only allows wARS/wBRL against USDT', () => {
    assert.deepEqual(resolveTextilePair('wARS', 'USDT')?.wfiat, 'wARS')
    assert.deepEqual(resolveTextilePair('USDT', 'wBRL')?.sellSymbol, 'USDT')
    assert.equal(resolveTextilePair('wMXN', 'USDT'), null)
    assert.equal(resolveTextilePair('wARS', 'wBRL'), null)
    assert.equal(resolveTextilePair('USDC', 'USDT'), null)
    assert.equal(tickerIdForWfiat('wARS'), 'USDT_WARS')
    assert.equal(tickerIdForWfiat('wBRL'), 'USDT_WBRL')
  })

  it('converts amounts and indicative ticker math', () => {
    assert.equal(toAtomicAmount('1', 'USDT'), '1000000')
    assert.equal(toAtomicAmount('1', 'wARS'), '1000000000000000000')
    assert.equal(fromAtomicAmount('1000000', 'USDT', 2), '1')
    assert.equal(
      indicativeBuyAmount({
        sellSymbol: 'USDT',
        buySymbol: 'wARS',
        sellAmountHuman: '2',
        localPerUsdt: 1580,
      }),
      '3160'
    )
    assert.equal(
      indicativeBuyAmount({
        sellSymbol: 'wARS',
        buySymbol: 'USDT',
        sellAmountHuman: '1580',
        localPerUsdt: 1580,
      }),
      '1'
    )
    assert.equal(applySlippageRay('1000000000000000000000000000', 50), '995000000000000000000000000')
  })
})
