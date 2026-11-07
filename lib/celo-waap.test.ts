import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ensureCeloNetwork } from './celo-waap'

type Call = { method: string; params?: unknown }

function makeWaap(
  options: { chainId?: string; switchError?: unknown; addError?: unknown } = {}
) {
  const calls: Call[] = []
  const chainId = options.chainId ?? '0xa4ec'

  return {
    calls,
    request: async ({
      method,
      params,
    }: {
      method: string
      params?: unknown[] | Record<string, unknown>
    }) => {
      calls.push({ method, params })
      switch (method) {
        case 'wallet_switchEthereumChain':
          if (options.switchError) throw options.switchError
          return null
        case 'wallet_addEthereumChain':
          if (options.addError) throw options.addError
          return null
        case 'eth_chainId':
          return chainId
        default:
          throw new Error(`unexpected method ${method}`)
      }
    },
  }
}

describe('ensureCeloNetwork', () => {
  it('switches to Celo mainnet and verifies the chain', async () => {
    const waap = makeWaap()
    await ensureCeloNetwork(waap)

    assert.deepEqual(
      waap.calls.map((call) => call.method),
      ['wallet_switchEthereumChain', 'eth_chainId']
    )
    assert.deepEqual(waap.calls[0].params, [{ chainId: '0xa4ec' }])
  })

  it('adds the Celo network when the wallet does not know it (4902)', async () => {
    const waap = makeWaap({
      switchError: Object.assign(new Error('Unrecognized chain'), { code: 4902 }),
    })

    await ensureCeloNetwork(waap)

    assert.deepEqual(
      waap.calls.map((call) => call.method),
      ['wallet_switchEthereumChain', 'wallet_addEthereumChain', 'eth_chainId']
    )
  })

  it('throws a clear error when the wallet stays on another chain', async () => {
    const waap = makeWaap({ chainId: '0xa' }) // Optimism, the chain seen in the wild

    await assert.rejects(() => ensureCeloNetwork(waap), /Celo Mainnet/)
  })

  it('re-throws switch errors that are not the 4902 add-chain case', async () => {
    const waap = makeWaap({
      switchError: Object.assign(new Error('User rejected the request'), { code: 4001 }),
    })

    await assert.rejects(() => ensureCeloNetwork(waap), /User rejected/)
  })
})
