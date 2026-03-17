import { createWalletClient, custom, parseUnits, encodeFunctionData, type Address } from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS } from './celo'
import { getCeloExplorerUrl } from './celo'
import type { WaaPWallet } from './wallet-utils'
import { getPrimaryWallet } from './wallet-utils'

/**
 * Payment utilities for sending transactions using the WaaP EOA wallet.
 * 
 * WaaP provides the EOA (Externally Owned Account) with Human Keys security.
 * Gas sponsorship (if enabled) is handled by WaaP's own Gas Tank / policies,
 * so from the app's perspective these are standard transactions.
 */

export interface PaymentParams {
  from: Address // User's wallet address
  to: Address // Recipient address (psychologist)
  amount: string // Amount in human-readable format (e.g., "10.5")
  currency: 'CELO' | 'USDT' | 'USDC' | 'cUSD' | 'cEUR' | 'cREAL' | 'cCOP' | 'PSY' | 'MOT' | 'cCAD' // Currency type
}

export interface PaymentResult {
  success: boolean
  transactionHash?: string
  error?: string
  explorerUrl?: string
}

/**
 * Create a wallet client from a WaaP wallet
 *
 * @param wallet - The WaaP wallet to use
 * @param allWallets - Optional: all available wallets to identify best wallet
 */
export async function createPrivyWalletClient(
  wallet: WaaPWallet, 
  allWallets?: WaaPWallet[]
) {
  // Try to get the primary wallet
  let targetWallet = wallet
  if (allWallets && allWallets.length > 0) {
    const primaryWallet = getPrimaryWallet(allWallets)
    if (primaryWallet) {
      targetWallet = primaryWallet
      console.log('✅ Using primary WaaP wallet:', targetWallet.address)
    }
  }
  
  console.log('✅ Creating wallet client for:', targetWallet.address)

  // WaaP provides an EIP-1193 compatible provider via window.waap
  // For direct wallet client creation, we need to get the provider
  if (typeof window === 'undefined' || !(window as unknown as { waap?: unknown }).waap) {
    throw new Error('WaaP provider not available. Please ensure WaaP is initialized.')
  }

  const waapProvider = (window as unknown as { waap: unknown }).waap

  return createWalletClient({
    account: targetWallet.address,
    chain: celoMainnet,
    transport: custom(waapProvider as Parameters<typeof custom>[0]),
  })
}

/**
 * Send a payment in native CELO
 *
 * @param wallet - The WaaP wallet to use
 * @param params - Payment parameters
 * @param allWallets - Optional: all available wallets
 * @returns Payment result with transaction hash
 */
export async function sendCELOPayment(
  wallet: WaaPWallet,
  params: PaymentParams,
  allWallets?: WaaPWallet[]
): Promise<PaymentResult> {
  try {
    const walletClient = await createPrivyWalletClient(wallet, allWallets)
    const amountInWei = parseUnits(params.amount, 18) // CELO has 18 decimals

    console.log('🔄 Sending CELO transaction via WaaP EOA...')
    
    const hash = await walletClient.sendTransaction({
      to: params.to,
      value: amountInWei,
    })

    console.log('✅ Transaction sent:', hash)

    return {
      success: true,
      transactionHash: hash,
      explorerUrl: getCeloExplorerUrl(hash, 'tx'),
    }
  } catch (error) {
    console.error('❌ Payment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    }
  }
}

/**
 * Send a payment in stablecoin (cUSD, cEUR)
 * Requires ERC20 token transfer
 */
export async function sendStablecoinPayment(
  wallet: WaaPWallet,
  params: PaymentParams
): Promise<PaymentResult> {
  try {
    const walletClient = await createPrivyWalletClient(wallet)
    
    // Get the token address
    const tokenAddress =
      params.currency === 'cUSD'
        ? CELO_STABLE_TOKENS.cUSD
        : CELO_STABLE_TOKENS.cEUR

    // ERC20 transfer function signature: transfer(address to, uint256 amount)
    const amountInWei = parseUnits(params.amount, 18) // Stablecoins have 18 decimals

    // Encode the transfer function call
    const data = encodeFunctionData({
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ],
      functionName: 'transfer',
      args: [params.to, amountInWei],
    })

    const hash = await walletClient.sendTransaction({
      to: tokenAddress,
      data,
    })

    return {
      success: true,
      transactionHash: hash,
      explorerUrl: getCeloExplorerUrl(hash, 'tx'),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    }
  }
}

// Reserved for future specialized WaaP/ethers encoding error handling if needed
