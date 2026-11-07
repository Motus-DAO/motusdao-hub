import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  RIPIO_CELO_CHAIN_ID,
  RIPIO_PUBLIC_RAMP_BASE_URL,
  buildRipioPublicRampUrl,
  isRipioCountry,
  ripioCountryFromEnv,
  ripioTokenForCountry,
} from './public-ramp'

const WALLET = '0x1111111111111111111111111111111111111111'

function parse(url: string) {
  const parsed = new URL(url)
  return { parsed, params: parsed.searchParams }
}

describe('Ripio public ramp', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_RIPIO_COUNTRY
  })

  it('builds the on-ramp URL with country, numeric chain, token and wallet', () => {
    const { parsed, params } = parse(
      buildRipioPublicRampUrl({ flow: 'onramp', country: 'MX', address: WALLET })
    )

    assert.equal(parsed.origin + parsed.pathname, `${RIPIO_PUBLIC_RAMP_BASE_URL}/`)
    assert.equal(params.get('country'), 'MX')
    assert.equal(params.get('chain'), String(RIPIO_CELO_CHAIN_ID))
    assert.equal(params.get('token'), 'WMXN')
    assert.equal(params.get('address'), WALLET)
    assert.equal(params.get('amount'), null)
  })

  it('builds the off-ramp URL on /offramp', () => {
    const { parsed, params } = parse(
      buildRipioPublicRampUrl({ flow: 'offramp', country: 'MX', address: WALLET })
    )

    assert.equal(parsed.origin + parsed.pathname, `${RIPIO_PUBLIC_RAMP_BASE_URL}/offramp`)
    assert.equal(params.get('token'), 'WMXN')
  })

  it('maps AR to wARS', () => {
    const { params } = parse(
      buildRipioPublicRampUrl({ flow: 'onramp', country: 'AR', address: WALLET })
    )
    assert.equal(params.get('token'), 'WARS')
    assert.equal(ripioTokenForCountry('AR'), 'wARS')
  })

  it('includes a valid amount and drops an empty one', () => {
    const withAmount = parse(
      buildRipioPublicRampUrl({ flow: 'onramp', country: 'MX', address: WALLET, amount: '500.5' })
    )
    assert.equal(withAmount.params.get('amount'), '500.5')

    const empty = parse(
      buildRipioPublicRampUrl({ flow: 'onramp', country: 'MX', address: WALLET, amount: '' })
    )
    assert.equal(empty.params.get('amount'), null)
  })

  it('rejects an invalid amount', () => {
    for (const amount of ['0', '-1', 'abc', '1e3', ' ']) {
      assert.throws(
        () => buildRipioPublicRampUrl({ flow: 'onramp', country: 'MX', address: WALLET, amount }),
        /monto/
      )
    }
  })

  it('rejects an invalid wallet address', () => {
    assert.throws(
      () => buildRipioPublicRampUrl({ flow: 'onramp', country: 'MX', address: '0x123' }),
      /dirección/
    )
  })

  it('defaults the country to MX and validates the env override', () => {
    process.env.NEXT_PUBLIC_RIPIO_COUNTRY = 'AR'
    assert.equal(ripioCountryFromEnv(), 'AR')

    process.env.NEXT_PUBLIC_RIPIO_COUNTRY = 'BR'
    assert.equal(ripioCountryFromEnv(), 'MX')

    assert.equal(isRipioCountry('MX'), true)
    assert.equal(isRipioCountry('BR'), false)
  })
})
