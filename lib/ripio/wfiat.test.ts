import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CELO_STABLE_TOKENS } from '../celo'
import {
  RIPIO_WFIAT_CATALOG,
  RIPIO_WFIAT_TOKENS,
  TEXTILE_FX_SWAP_URL,
  getTextileFxSwapUrl,
  isRipioWfiatSymbol,
  isValidWfiatAddress,
} from './wfiat'

describe('Ripio wFIAT on Celo', () => {
  it('publishes six checksummed ERC-20 addresses used by Pagos', () => {
    const symbols = Object.keys(RIPIO_WFIAT_TOKENS)
    assert.deepEqual(symbols.sort(), ['wARS', 'wBRL', 'wCLP', 'wCOP', 'wMXN', 'wPEN'])
    for (const [symbol, address] of Object.entries(RIPIO_WFIAT_TOKENS)) {
      assert.equal(isValidWfiatAddress(address), true, `${symbol} address`)
      assert.equal(CELO_STABLE_TOKENS[symbol as keyof typeof CELO_STABLE_TOKENS], address)
    }
    assert.equal(RIPIO_WFIAT_CATALOG.length, 6)
  })

  it('keeps all six wFIAT symbols distinguishable from Mento', () => {
    assert.equal(isRipioWfiatSymbol('wARS'), true)
    assert.equal(isRipioWfiatSymbol('USDm'), false)
    assert.equal(isRipioWfiatSymbol('BRLm'), false)
  })

  it('only wARS and wBRL have an external Textile FX URL', () => {
    assert.equal(getTextileFxSwapUrl('wARS'), TEXTILE_FX_SWAP_URL)
    assert.equal(getTextileFxSwapUrl('wBRL'), TEXTILE_FX_SWAP_URL)
    assert.equal(getTextileFxSwapUrl('wMXN'), null)
    assert.equal(getTextileFxSwapUrl('USDT'), null)
  })
})
