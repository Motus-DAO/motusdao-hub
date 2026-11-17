import { createPublicClient, formatUnits, http, type Address } from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS, getCeloTokenDecimals } from '@/lib/celo'

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const publicClient = createPublicClient({
  chain: celoMainnet,
  transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
})

/** Read-only catalog for linked-wallet balances (not full /pagos token grid). */
export const LINKED_WALLET_BALANCE_SYMBOLS = [
  'CELO',
  'USDT',
  'USDC',
  'USDm',
  'EURm',
  'wMXN',
] as const

export type LinkedWalletBalanceRow = {
  symbol: string
  balance: string
  rawBalance: string
}

export type LinkedWalletBalancesSnapshot = {
  address: string
  balances: LinkedWalletBalanceRow[]
  error?: string
}

async function readTokenBalance(
  holder: Address,
  symbol: string
): Promise<LinkedWalletBalanceRow> {
  if (symbol === 'CELO') {
    const raw = await publicClient.getBalance({ address: holder })
    return {
      symbol,
      balance: formatUnits(raw, 18),
      rawBalance: raw.toString(),
    }
  }

  const token =
    CELO_STABLE_TOKENS[symbol as keyof typeof CELO_STABLE_TOKENS]
  if (!token) {
    return { symbol, balance: '0', rawBalance: '0' }
  }

  const raw = await publicClient.readContract({
    address: token as Address,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [holder],
  })

  const decimals = getCeloTokenDecimals(symbol)
  return {
    symbol,
    balance: formatUnits(raw, decimals),
    rawBalance: raw.toString(),
  }
}

export async function fetchLinkedWalletBalancesForAddress(
  address: string
): Promise<LinkedWalletBalancesSnapshot> {
  try {
    const holder = address as Address
    const balances = await Promise.all(
      LINKED_WALLET_BALANCE_SYMBOLS.map((symbol) =>
        readTokenBalance(holder, symbol)
      )
    )
    return { address: holder.toLowerCase(), balances }
  } catch (error) {
    return {
      address: address.toLowerCase(),
      balances: [],
      error:
        error instanceof Error ? error.message : 'No se pudo leer el saldo',
    }
  }
}