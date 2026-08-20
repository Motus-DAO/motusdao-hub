import { createPublicClient, http, formatUnits, type Address } from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS, getCeloTokenDecimals } from './celo'

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Create public client for reading balances
const publicClient = createPublicClient({
  chain: celoMainnet,
  transport: http(),
})

export interface TokenBalance {
  symbol: string
  name: string
  balance: string // Formatted balance (human-readable)
  rawBalance: bigint // Raw balance in wei
  address?: string // Token contract address (undefined for native CELO)
}

/**
 * Get native CELO balance
 */
export async function getCELOBalance(address: Address): Promise<TokenBalance> {
  try {
    const balance = await publicClient.getBalance({
      address,
    })

    return {
      symbol: 'CELO',
      name: 'Celo',
      balance: formatUnits(balance, 18),
      rawBalance: balance,
    }
  } catch (error) {
    console.error('Error getting CELO balance:', error)
    return {
      symbol: 'CELO',
      name: 'Celo',
      balance: '0',
      rawBalance: BigInt(0),
    }
  }
}

/**
 * Get ERC20 token balance
 */
export async function getTokenBalance(
  address: Address,
  tokenSymbol: string,
  tokenAddress: string
): Promise<TokenBalance> {
  try {
    const decimals = getCeloTokenDecimals(tokenSymbol)
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    })

    return {
      symbol: tokenSymbol,
      name: tokenSymbol,
      balance: formatUnits(balance, decimals),
      rawBalance: balance,
      address: tokenAddress,
    }
  } catch (error) {
    console.error(`Error getting ${tokenSymbol} balance:`, error)
    return {
      symbol: tokenSymbol,
      name: tokenSymbol,
      balance: '0',
      rawBalance: BigInt(0),
      address: tokenAddress,
    }
  }
}

/**
 * Get balances for all enabled tokens
 */
export async function getAllTokenBalances(
  address: Address,
  enabledTokens: string[]
): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = []

  // Always get CELO balance
  const celoBalance = await getCELOBalance(address)
  balances.push(celoBalance)

  // Get balances for enabled ERC20 tokens
  const tokenPromises = enabledTokens
    .filter(token => token !== 'CELO') // CELO already handled
    .map(async (tokenSymbol) => {
      const tokenAddress = CELO_STABLE_TOKENS[tokenSymbol as keyof typeof CELO_STABLE_TOKENS]
      
      // Skip if token address is not configured
      if (!tokenAddress) {
        return null
      }

      return getTokenBalance(address, tokenSymbol, tokenAddress)
    })

  const tokenBalances = await Promise.all(tokenPromises)
  
  // Filter out null results and add to balances
  tokenBalances.forEach((balance) => {
    if (balance) {
      balances.push(balance)
    }
  })

  return balances
}

