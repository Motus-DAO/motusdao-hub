import { createWalletClient, createPublicClient, custom, http, parseUnits, encodeFunctionData, maxUint256, type Address, type Hex } from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS, getCeloTokenDecimals, type PaymentCurrency } from './celo'
import { getCeloExplorerUrl } from './celo'
import type { WaaPWallet } from './wallet-utils'
import { getPrimaryWallet } from './wallet-utils'

export type { PaymentCurrency }

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
  currency: PaymentCurrency
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
 * Send a payment in ERC20 stablecoin or utility token
 */
export async function sendStablecoinPayment(
  wallet: WaaPWallet,
  params: PaymentParams
): Promise<PaymentResult> {
  try {
    const walletClient = await createPrivyWalletClient(wallet)
    
    const tokenAddress = CELO_STABLE_TOKENS[params.currency as keyof typeof CELO_STABLE_TOKENS]
    if (!tokenAddress) {
      return {
        success: false,
        error: `Token no soportado: ${params.currency}`,
      }
    }

    // ERC20 transfer function signature: transfer(address to, uint256 amount)
    const amountInWei = parseUnits(params.amount, getCeloTokenDecimals(params.currency))

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

const celoPublicClient = createPublicClient({
  chain: celoMainnet,
  transport: http(),
})

/** Sign and broadcast an unsigned EVM tx with the user's WaaP wallet (in-app swap). */
export async function sendUnsignedEvmTx(
  wallet: WaaPWallet,
  tx: { to: string; data: string; value?: string },
  options?: { wait?: boolean }
): Promise<PaymentResult> {
  try {
    const walletClient = await createPrivyWalletClient(wallet)
    const hash = await walletClient.sendTransaction({
      to: tx.to as Address,
      data: tx.data as Hex,
      value: BigInt(tx.value || '0'),
    })

    if (options?.wait !== false) {
      const receipt = await celoPublicClient.waitForTransactionReceipt({ hash })
      if (receipt.status === 'reverted') {
        return {
          success: false,
          transactionHash: hash,
          explorerUrl: getCeloExplorerUrl(hash, 'tx'),
          error:
            'La transacción se revirtió on-chain. Si era un swap Textile, la cotización RFQ (~30 s) probablemente expiró. Vuelve a confirmar: la aprobación ya debería estar hecha.',
        }
      }
    }

    return {
      success: true,
      transactionHash: hash,
      explorerUrl: getCeloExplorerUrl(hash, 'tx'),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    }
  }
}

const ERC20_ALLOWANCE_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

/** Approve spender if allowance is below `required`. Unlimited approve so RFQ TTL is not spent on this. */
export async function ensureErc20Allowance(params: {
  wallet: WaaPWallet
  owner: Address
  token: Address
  spender: Address
  required: bigint
}): Promise<PaymentResult & { skipped?: boolean }> {
  try {
    const allowance = (await celoPublicClient.readContract({
      address: params.token,
      abi: ERC20_ALLOWANCE_ABI,
      functionName: 'allowance',
      args: [params.owner, params.spender],
    })) as bigint

    if (allowance >= params.required) {
      return { success: true, skipped: true }
    }

    const data = encodeFunctionData({
      abi: ERC20_ALLOWANCE_ABI,
      functionName: 'approve',
      args: [params.spender, maxUint256],
    })

    return sendUnsignedEvmTx(params.wallet, { to: params.token, data, value: '0' }, { wait: true })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo revisar el allowance',
    }
  }
}
