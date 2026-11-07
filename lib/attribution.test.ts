import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  ATTRIBUTION_CODE_ENV,
  appendAttributionData,
  getAttributionCode,
  getAttributionSuffix,
  isAttributionCode,
} from './attribution'

const ENV_KEYS = [ATTRIBUTION_CODE_ENV, 'CELO_ATTRIBUTION_CODE'] as const

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key]
}

describe('Celo attribution (ERC-8021)', () => {
  beforeEach(clearEnv)
  afterEach(clearEnv)

  it('accepts only the ERC-8021 code alphabet', () => {
    assert.equal(isAttributionCode('celo_test1234'), true)
    assert.equal(isAttributionCode('myapp'), true)
    assert.equal(isAttributionCode('celo_TEST'), false)
    assert.equal(isAttributionCode('celo-test'), false)
    assert.equal(isAttributionCode(''), false)
    assert.equal(isAttributionCode('a'.repeat(33)), false)
    assert.equal(isAttributionCode(42), false)
  })

  it('is disabled when no code is configured', () => {
    assert.equal(getAttributionCode(), null)
    assert.equal(getAttributionSuffix(), undefined)
  })

  it('encodes a configured code into a 0x suffix', () => {
    process.env[ATTRIBUTION_CODE_ENV] = 'celo_test1234'
    const suffix = getAttributionSuffix()
    assert.match(suffix ?? '', /^0x[0-9a-f]+$/i)
    assert.equal(getAttributionSuffix(), suffix, 'suffix is cached per code')
    assert.equal(getAttributionSuffix(), getAttributionSuffix())
  })

  it('re-encodes when the configured code changes', () => {
    process.env[ATTRIBUTION_CODE_ENV] = 'celo_test1234'
    const first = getAttributionSuffix()
    process.env[ATTRIBUTION_CODE_ENV] = 'other_app'
    const second = getAttributionSuffix()
    assert.notEqual(first, second)
  })

  it('ignores a malformed code instead of breaking payments', () => {
    process.env[ATTRIBUTION_CODE_ENV] = 'Celo-BAD'
    assert.equal(getAttributionCode(), null)
    assert.equal(getAttributionSuffix(), undefined)
  })

  it('falls back to the server-side env name', () => {
    process.env.CELO_ATTRIBUTION_CODE = 'celo_server1'
    assert.equal(getAttributionCode(), 'celo_server1')
  })

  it('appends the suffix to raw calldata and is idempotent', () => {
    process.env[ATTRIBUTION_CODE_ENV] = 'celo_test1234'
    const suffix = getAttributionSuffix()
    assert.ok(suffix)

    const data = '0xabcdef'
    const tagged = appendAttributionData(data)
    assert.equal(tagged, `${data}${suffix.slice(2)}`)
    assert.equal(appendAttributionData(tagged), tagged)

    assert.equal(appendAttributionData(undefined), suffix)
    assert.equal(appendAttributionData('0x'), suffix)
  })

  it('leaves calldata untouched when tagging is disabled', () => {
    assert.equal(appendAttributionData('0xabcdef'), '0xabcdef')
    assert.equal(appendAttributionData(undefined), undefined)
  })
})
