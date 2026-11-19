import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getAddress } from 'viem'
import { resolveEip1193SignerAddress } from './eip1193-accounts'

const SAMPLE = getAddress('0xAb5801a7D398351b8bB21C542cFc122C5b76c3A0')

describe('resolveEip1193SignerAddress', () => {
  it('uses eth_accounts before eth_requestAccounts', async () => {
    const calls: string[] = []
    const provider = {
      request: async ({ method }: { method: string }) => {
        calls.push(method)
        if (method === 'eth_accounts') {
          return [SAMPLE]
        }
        throw new Error('eth_requestAccounts should not run')
      },
    }

    const addr = await resolveEip1193SignerAddress(provider)
    assert.equal(addr, SAMPLE)
    assert.deepEqual(calls, ['eth_accounts'])
  })

  it('falls back to eth_requestAccounts when eth_accounts is empty', async () => {
    const provider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_accounts') return []
        if (method === 'eth_requestAccounts') {
          return [SAMPLE]
        }
        return []
      },
    }

    const addr = await resolveEip1193SignerAddress(provider)
    assert.equal(addr, SAMPLE)
  })
})