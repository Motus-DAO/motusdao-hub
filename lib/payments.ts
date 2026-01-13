import { createWalletClient, custom, parseUnits, parseEther, encodeFunctionData, type Address } from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS } from './celo'
import { getCeloExplorerUrl } from './celo'
import type { WaaPWallet } from './wallet-utils'
import { getPrimaryWallet } from './wallet-utils'
import type { KernelAccountClient } from '@zerodev/sdk'

/**
 * Payment utilities for sending transactions with gas sponsorship
 * Gas fees are automatically sponsored by Pimlico paymaster
 * 
 * With WaaP + ZeroDev architecture:
 * - WaaP provides the EOA (Externally Owned Account) with Human Keys security
 * - ZeroDev creates smart wallets using the WaaP EOA as the signer
 * - Pimlico sponsors gas fees through the paymaster
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
 * Note: For gasless transactions, use sendPaymentWithKernel instead,
 * which uses the ZeroDev Kernel client with Pimlico paymaster.
 * 
 * @param wallet - The WaaP wallet to use
 * @param allWallets - Optional: all available wallets to identify best wallet
 * @param allowEOA - If true, allows using EOA directly (default: false)
 */
export async function createPrivyWalletClient(
  wallet: WaaPWallet, 
  allWallets?: WaaPWallet[],
  allowEOA: boolean = false
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
  console.log('ℹ️ Note: For gasless transactions, use sendPaymentWithKernel with ZeroDev Kernel client')

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
 * NOTE: For gasless transactions, use sendPaymentWithKernel instead.
 * This function uses direct WaaP wallet which will require gas.
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
    const walletClient = await createPrivyWalletClient(wallet, allWallets, true)
    const amountInWei = parseUnits(params.amount, 18) // CELO has 18 decimals

    console.log('🔄 Sending CELO transaction via WaaP...')
    console.log('⚠️ Note: For gasless transactions, use sendPaymentWithKernel')
    
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
 * 
 * NOTE: For gasless transactions, use sendPaymentWithKernel instead.
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

/**
 * Check if an error is the known WaaP/ethers encoding error
 * This error is non-fatal and can be ignored
 */
function isEncodingError(error: unknown): boolean {
  if (!error) return false
  const errorStr = error instanceof Error ? error.message : String(error)
  return errorStr.includes('invalid codepoint') || 
         errorStr.includes('missing continuation byte') ||
         errorStr.includes('strings/5.7.0')
}

/**
 * Send a payment using ZeroDev Kernel client (gasless transactions)
 * Supports both native CELO and ERC20 tokens
 * 
 * IMPORTANT: The ZeroDev smart wallet is what generates and signs the UserOperations.
 * The WaaP EOA is only used as the owner/signer of the smart wallet.
 * Pimlico sponsors the gas for these transactions.
 * 
 * This is the recommended method for gasless transactions with WaaP + ZeroDev.
 * 
 * @param kernelClient - The ZeroDev Kernel account client (smart wallet)
 * @param params - Payment parameters
 * @returns Payment result with transaction hash
 */
export async function sendPaymentWithKernel(
  kernelClient: KernelAccountClient,
  params: PaymentParams
): Promise<PaymentResult> {
  try {
    // DETAILED DEBUG: Log all incoming parameters
    console.log('═══════════════════════════════════════════════════════')
    console.log('📩 sendPaymentWithKernel called with params:')
    console.log('   - from:', params.from)
    console.log('   - to:', params.to)
    console.log('   - amount:', params.amount)
    console.log('   - currency:', params.currency)
    console.log('   - currency type:', typeof params.currency)
    console.log('   - currency === "CELO":', params.currency === 'CELO')
    console.log('   - currency !== "CELO":', params.currency !== 'CELO')
    console.log('═══════════════════════════════════════════════════════')
    
    // Validate address
    if (!params.to || !params.to.startsWith('0x') || params.to.length !== 42) {
      return {
        success: false,
        error: 'Dirección de destino inválida',
      }
    }

    // Validate amount
    const amount = parseFloat(params.amount)
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: 'Monto inválido. Debe ser un número mayor a 0',
      }
    }

    // Log smart wallet address to confirm we're using the right wallet
    const smartWalletAddress = kernelClient.account?.address
    console.log('🔐 Using ZeroDev Smart Wallet:', smartWalletAddress)
    console.log('💡 Gas will be sponsored by Pimlico paymaster')

    // Check if it's native CELO or ERC20 token
    console.log('🔍 Checking currency type...')
    console.log('   params.currency:', JSON.stringify(params.currency))
    console.log('   Is CELO?:', params.currency === 'CELO')
    
    if (params.currency === 'CELO') {
      console.log('✅ Taking NATIVE CELO path')
      // Native CELO transfer
      const amountInWei = parseEther(params.amount)

      console.log('🔄 Enviando transacción de CELO usando ZeroDev Kernel...')
      console.log('📍 Smart Wallet (sender):', smartWalletAddress)
      console.log('📍 Destino:', params.to)
      console.log('💰 Monto:', params.amount, 'CELO')

      const userOpHash = await kernelClient.sendUserOperation({
        calls: [{
          to: params.to as `0x${string}`,
          value: amountInWei,
          data: '0x' as `0x${string}`,
        }],
      })

      console.log('✅ User operation enviada:', userOpHash)
      console.log('⏳ Esperando confirmación en la blockchain...')

      // Wait for the user operation to be included
      // Wrap in try-catch to handle non-fatal encoding errors from WaaP SDK
      let hash: string | undefined
      try {
        const receipt = await kernelClient.waitForUserOperationReceipt({
          hash: userOpHash
        })
        hash = receipt?.receipt?.transactionHash
      } catch (receiptError) {
        // Check if this is the known encoding error - if so, the tx likely succeeded
        if (isEncodingError(receiptError)) {
          console.warn('⚠️ Non-fatal encoding error during receipt wait (tx may have succeeded)')
          // Try to return success with the userOpHash as reference
          return {
            success: true,
            transactionHash: userOpHash,
            explorerUrl: getCeloExplorerUrl(userOpHash, 'tx'),
          }
        }
        throw receiptError
      }

      if (!hash) {
        throw new Error('No se encontró el hash de transacción en el recibo')
      }

      console.log('✅ Transacción confirmada:', hash)

      return {
        success: true,
        transactionHash: hash,
        explorerUrl: getCeloExplorerUrl(hash, 'tx'),
      }
    } else {
      // ERC20 token transfer
      console.log('✅ Taking ERC20 TOKEN path for:', params.currency)
      
      const tokenAddress = CELO_STABLE_TOKENS[params.currency as keyof typeof CELO_STABLE_TOKENS]
      console.log('📦 Token address from CELO_STABLE_TOKENS:', tokenAddress)
      
      if (!tokenAddress) {
        return {
          success: false,
          error: `Dirección del contrato para ${params.currency} no configurada. Por favor, actualiza lib/celo.ts con la dirección correcta.`,
        }
      }

      // ERC20 transfer function: transfer(address to, uint256 amount)
      const amountInWei = parseUnits(params.amount, 18) // Most tokens have 18 decimals

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
        args: [params.to as `0x${string}`, amountInWei],
      })

      console.log('🔄 Enviando transacción de token usando ZeroDev Kernel...')
      console.log('📍 Smart Wallet (sender):', smartWalletAddress)
      console.log('📍 Token:', params.currency)
      console.log('📍 Contrato del token:', tokenAddress)
      console.log('📍 Destino (recipient):', params.to)
      console.log('💰 Monto:', params.amount, params.currency)
      console.log('📦 ERC20 transfer data (hex):', data)
      console.log('📦 ERC20 transfer data length:', data.length, 'chars')
      
      // Build the call object explicitly to avoid any issues
      const callObject = {
        to: tokenAddress as `0x${string}`,
        value: BigInt(0), // Must be 0 for ERC20 transfers!
        data: data as `0x${string}`,
      }
      
      console.log('📦 Call object being sent:')
      console.log('   - to (token contract):', callObject.to)
      console.log('   - value:', callObject.value.toString())
      console.log('   - data length:', callObject.data.length, 'chars')
      console.log('   - data preview:', callObject.data.slice(0, 20) + '...')
      
      // Verify call object is correct before sending
      if (callObject.to !== tokenAddress) {
        console.error('❌ BUG: to address mismatch!')
        console.error('   Expected:', tokenAddress)
        console.error('   Got:', callObject.to)
      }
      if (callObject.value !== BigInt(0)) {
        console.error('❌ BUG: value should be 0 for ERC20 transfer!')
        console.error('   Got:', callObject.value.toString())
      }
      if (!callObject.data || callObject.data === '0x' || callObject.data.length < 10) {
        console.error('❌ BUG: data is empty or invalid for ERC20 transfer!')
        console.error('   Got:', callObject.data)
      }

      const userOpHash = await kernelClient.sendUserOperation({
        calls: [callObject],
      })

      console.log('✅ User operation enviada:', userOpHash)
      console.log('⏳ Esperando confirmación en la blockchain...')

      // Wait for the user operation to be included
      // Wrap in try-catch to handle non-fatal encoding errors from WaaP SDK
      let hash: string | undefined
      try {
        const receipt = await kernelClient.waitForUserOperationReceipt({
          hash: userOpHash
        })
        hash = receipt?.receipt?.transactionHash
      } catch (receiptError) {
        // Check if this is the known encoding error - if so, the tx likely succeeded
        if (isEncodingError(receiptError)) {
          console.warn('⚠️ Non-fatal encoding error during receipt wait (tx may have succeeded)')
          // Try to return success with the userOpHash as reference
          return {
            success: true,
            transactionHash: userOpHash,
            explorerUrl: getCeloExplorerUrl(userOpHash, 'tx'),
          }
        }
        throw receiptError
      }

      if (!hash) {
        throw new Error('No se encontró el hash de transacción en el recibo')
      }

      console.log('✅ Transacción confirmada:', hash)

      return {
        success: true,
        transactionHash: hash,
        explorerUrl: getCeloExplorerUrl(hash, 'tx'),
      }
    }
  } catch (error) {
    // Check if this is the known encoding error - if so, don't treat as fatal
    if (isEncodingError(error)) {
      console.warn('⚠️ Non-fatal encoding error caught at top level')
      return {
        success: false,
        error: 'La transacción fue enviada pero hubo un error al procesar la respuesta. Por favor verifica en el explorador de blockchain.',
      }
    }
    
    console.error('❌ Error en el pago:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    
    // Check for common errors
    if (errorMessage.toLowerCase().includes('fund') || 
        errorMessage.toLowerCase().includes('balance') ||
        errorMessage.toLowerCase().includes('insufficient')) {
      return {
        success: false,
        error: `${errorMessage}. Asegúrate de tener fondos suficientes y que el paymaster esté financiado.`,
      }
    }
    
    // Check for Pimlico billing limit errors
    if (errorMessage.toLowerCase().includes('monthly') || 
        errorMessage.toLowerCase().includes('sponsorship limit') ||
        errorMessage.toLowerCase().includes('billing plan') ||
        errorMessage.toLowerCase().includes('upgrade your billing')) {
      return {
        success: false,
        error: `⚠️ El paymaster de Pimlico tiene un límite mensual.\n\n` +
          `Por favor verifica tu plan en el dashboard de Pimlico.\n\n` +
          `Opciones:\n` +
          `1. Verificar fondos del paymaster en Pimlico dashboard\n` +
          `2. Actualizar plan si es necesario\n` +
          `3. Usar Alfajores (testnet) para desarrollo`,
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}
