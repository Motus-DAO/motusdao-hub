import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  getConfiguredWalletProvider,
  getThirdwebClientId,
} from './config'

const envKeys = [
  'NEXT_PUBLIC_WALLET_PROVIDER',
  'NEXT_PUBLIC_THIRDWEB_CLIENT_ID',
] as const

function snapshotEnv(): Record<(typeof envKeys)[number], string | undefined> {
  return Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<
    (typeof envKeys)[number],
    string | undefined
  >
}

function restoreEnv(snapshot: Record<(typeof envKeys)[number], string | undefined>) {
  for (const key of envKeys) {
    const value = snapshot[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe('getConfiguredWalletProvider', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_WALLET_PROVIDER
  })

  it('defaults to waap when unset', () => {
    assert.equal(getConfiguredWalletProvider(), 'waap')
  })

  it('returns thirdweb when configured', () => {
    process.env.NEXT_PUBLIC_WALLET_PROVIDER = 'thirdweb'
    assert.equal(getConfiguredWalletProvider(), 'thirdweb')
  })

  it('falls back to waap for invalid values', () => {
    process.env.NEXT_PUBLIC_WALLET_PROVIDER = 'not-a-provider'
    assert.equal(getConfiguredWalletProvider(), 'waap')
  })

  it('still accepts privy during I1', () => {
    process.env.NEXT_PUBLIC_WALLET_PROVIDER = 'privy'
    assert.equal(getConfiguredWalletProvider(), 'privy')
  })
})

describe('getThirdwebClientId', () => {
  it('returns trimmed client id when set', () => {
    const snapshot = snapshotEnv()
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = '  abc123  '
    try {
      assert.equal(getThirdwebClientId(), 'abc123')
    } finally {
      restoreEnv(snapshot)
    }
  })
})