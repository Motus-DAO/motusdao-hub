import type { Address, PublicClient } from 'viem'
import { celoMainnet } from './celo'

export const CELO_CHAIN_ID = celoMainnet.id
export const CELO_CHAIN_ID_HEX = '0xa4ec' as const

type WaaPLike = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>
}

export type WaaPCeloTxParams = {
  from: Address
  to: Address
  data: `0x${string}`
  value: string
  chainId: typeof CELO_CHAIN_ID_HEX
  gas: string
  /** Legacy gas price — WaaP's signer mishandles EIP-1559 on Celo and overshoots balance checks. */
  gasPrice: string
}

const CELO_NETWORK_PARAMS = {
  chainId: CELO_CHAIN_ID_HEX,
  chainName: 'Celo',
  nativeCurrency: {
    name: 'CELO',
    symbol: 'CELO',
    decimals: 18,
  },
  rpcUrls: ['https://forno.celo.org'],
  blockExplorerUrls: ['https://celoscan.io'],
}

function isChainNotAddedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: number }).code
  return code === 4902
}

/**
 * Ensures the WaaP wallet is connected to Celo Mainnet before sending transactions.
 */
export async function ensureCeloNetwork(waap: WaaPLike): Promise<void> {
  try {
    await waap.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CELO_CHAIN_ID_HEX }],
    })
  } catch (error) {
    if (!isChainNotAddedError(error)) {
      throw error
    }

    await waap.request({
      method: 'wallet_addEthereumChain',
      params: [CELO_NETWORK_PARAMS],
    })
  }

  const chainId = await waap.request({ method: 'eth_chainId' })
  const parsedChainId =
    typeof chainId === 'string' ? parseInt(chainId, 16) : Number(chainId)

  if (parsedChainId !== CELO_CHAIN_ID) {
    throw new Error(
      'La wallet no está en Celo Mainnet. Cambia a la red Celo e inténtalo de nuevo.'
    )
  }
}

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`
}

/**
 * Build eth_sendTransaction params using real Celo gas data.
 * Uses legacy gasPrice (type-0) because WaaP's useEthTxFlow overshoots balance
 * checks when maxFeePerGas is present on Celo (~0.12 CELO reserved vs ~0.001 actual).
 */
export async function buildCeloWaaPTransaction(
  client: PublicClient,
  from: Address,
  to: Address,
  data: `0x${string}`
): Promise<{ params: WaaPCeloTxParams; estimatedCostWei: bigint }> {
  const [gasEstimate, gasPrice] = await Promise.all([
    client.estimateGas({ account: from, to, data, value: BigInt(0) }),
    client.getGasPrice(),
  ])

  const gas = (gasEstimate * BigInt(130)) / BigInt(100)

  return {
    params: {
      from,
      to,
      data,
      value: '0x0',
      chainId: CELO_CHAIN_ID_HEX,
      gas: toHex(gas),
      gasPrice: toHex(gasPrice),
    },
    estimatedCostWei: gas * gasPrice,
  }
}
