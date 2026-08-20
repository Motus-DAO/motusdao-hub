import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatUnits } from 'viem'
import { CELO_STABLE_TOKENS, getCeloTokenDecimals } from './celo'

describe('Celo token decimals', () => {
  it('formats native USDT with 6 decimals so 1 USDT is not shown as 0', () => {
    assert.equal(CELO_STABLE_TOKENS.USDT, '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e')
    assert.equal(getCeloTokenDecimals('USDT'), 6)
    assert.equal(getCeloTokenDecimals('USDC'), 6)
    assert.equal(formatUnits(BigInt(1_000_000), getCeloTokenDecimals('USDT')), '1')
    assert.notEqual(formatUnits(BigInt(1_000_000), 18), '1')
  })

  it('keeps Mento and Ripio wFIAT at 18 decimals', () => {
    assert.equal(getCeloTokenDecimals('USDm'), 18)
    assert.equal(getCeloTokenDecimals('wBRL'), 18)
    assert.equal(getCeloTokenDecimals('CELO'), 18)
  })
})
