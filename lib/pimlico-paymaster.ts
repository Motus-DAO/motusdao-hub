/**
 * Pimlico Paymaster Utilities
 * 
 * Módulo centralizado para manejar el paymaster de Pimlico.
 * Proporciona configuración reutilizable para gasless transactions en toda la app.
 * 
 * USO:
 * 1. En ZeroDevSmartWalletProvider: usa createPimlicoPaymasterConfig()
 * 2. En cualquier lugar que necesite llamar al paymaster: usa el proxy /api/pimlico/paymaster
 * 
 * ARQUITECTURA:
 * - El API key de Pimlico se mantiene seguro en el servidor
 * - El cliente llama al proxy /api/pimlico/paymaster
 * - El proxy añade el API key y redirige a Pimlico
 * 
 * MÉTODOS SOPORTADOS (ERC-4337 v0.7):
 * - pm_getPaymasterStubData: Para estimación de gas
 * - pm_getPaymasterData: Para datos finales del paymaster
 * - pm_sponsorUserOperation: Método combinado/legacy
 */

import type { Address } from 'viem'
import { toHex } from 'viem'

// Constantes de Pimlico para Celo Mainnet
export const PIMLICO_PAYMASTER_ADDRESS = '0x777777777777AeC03fd955926DbF81597e66834C' as const
export const ENTRYPOINT_V07_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const
export const CELO_MAINNET_CHAIN_ID = 42220

/**
 * Tipo para los parámetros del paymaster
 * Compatible con los tipos de ZeroDev SDK
 */
export interface PaymasterDataArgs {
  sender: Address
  nonce: bigint
  callData: `0x${string}`
  callGasLimit?: bigint
  verificationGasLimit?: bigint
  preVerificationGas?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  signature?: `0x${string}`
  factory?: Address
  factoryData?: `0x${string}`
  paymaster?: Address
  paymasterData?: `0x${string}`
  paymasterVerificationGasLimit?: bigint
  paymasterPostOpGasLimit?: bigint
  chainId: number
  entryPointAddress: Address
  context?: unknown
}

/**
 * Respuesta del paymaster de Pimlico
 */
export interface PaymasterResponse {
  paymaster: Address
  paymasterData: `0x${string}`
  paymasterVerificationGasLimit: string
  paymasterPostOpGasLimit: string
  callGasLimit?: string
  verificationGasLimit?: string
  preVerificationGas?: string
}

/**
 * Helper para convertir varios formatos de gas limits a bigint
 */
export function toGasLimit(value: string | number | bigint | undefined | null): bigint {
  if (value === undefined || value === null) return BigInt(0)
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(value)
  if (typeof value === 'string') {
    if (value.startsWith('0x')) return BigInt(value)
    return BigInt(value)
  }
  return BigInt(0)
}

/**
 * Construye la URL del proxy del paymaster
 */
export function getPaymasterProxyUrl(chainId: number = CELO_MAINNET_CHAIN_ID): string {
  return `/api/pimlico/paymaster?chainId=${chainId}`
}

/**
 * Llama al paymaster de Pimlico a través del proxy seguro
 * Usa pm_sponsorUserOperation que es el método más confiable
 * 
 * @param args - Argumentos del UserOp
 * @param chainId - Chain ID (default: Celo Mainnet)
 * @returns Respuesta del paymaster con todos los datos necesarios
 */
export async function callPimlicoPaymaster(
  args: PaymasterDataArgs,
  chainId: number = CELO_MAINNET_CHAIN_ID
): Promise<PaymasterResponse> {
  const proxyUrl = getPaymasterProxyUrl(chainId)
  
  console.log('[PIMLICO] 💰 Calling pm_sponsorUserOperation')
  
  // Build the userOp for Pimlico API
  const userOpForPimlico: Record<string, string | null> = {
    sender: args.sender,
    nonce: toHex(args.nonce),
    callData: args.callData,
    callGasLimit: args.callGasLimit ? toHex(args.callGasLimit) : '0x1',
    verificationGasLimit: args.verificationGasLimit ? toHex(args.verificationGasLimit) : '0x1',
    preVerificationGas: args.preVerificationGas ? toHex(args.preVerificationGas) : '0x1',
    maxFeePerGas: args.maxFeePerGas ? toHex(args.maxFeePerGas) : '0xb2d05e00', // ~3 gwei default
    maxPriorityFeePerGas: args.maxPriorityFeePerGas ? toHex(args.maxPriorityFeePerGas) : '0x1',
    // Dummy signature for estimation - required by Pimlico
    signature: args.signature || '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c',
    // Include factory/factoryData for undeployed accounts (AA20 fix)
    ...(args.factory && { factory: args.factory }),
    ...(args.factoryData && { factoryData: args.factoryData }),
  }
  
  console.log('[PIMLICO] 📤 Sending request:', {
    sender: userOpForPimlico.sender,
    nonce: userOpForPimlico.nonce,
    hasFactory: !!args.factory,
  })
  
  // Call Pimlico paymaster API - pm_sponsorUserOperation takes 2 params
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_sponsorUserOperation',
      params: [
        userOpForPimlico,
        args.entryPointAddress || ENTRYPOINT_V07_ADDRESS,
      ],
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[PIMLICO] ❌ API error:', response.status, errorText)
    throw new Error(`Pimlico paymaster error: ${response.status} ${errorText}`)
  }
  
  const data = await response.json()
  
  if (data.error) {
    console.error('[PIMLICO] ❌ RPC error:', data.error)
    throw new Error(`Pimlico paymaster error: ${data.error.message || JSON.stringify(data.error)}`)
  }
  
  console.log('[PIMLICO] ✅ Sponsorship response:', {
    paymaster: data.result.paymaster,
    paymasterDataLength: data.result.paymasterData?.length || 0,
    paymasterVerificationGasLimit: data.result.paymasterVerificationGasLimit,
    paymasterPostOpGasLimit: data.result.paymasterPostOpGasLimit,
  })
  
  return data.result
}

/**
 * Llama a pm_getPaymasterStubData de Pimlico para obtener stub data válido
 * Esto es necesario para cuentas nuevas que aún no han sido deployadas
 */
async function callPimlicoStubData(
  args: PaymasterDataArgs,
  chainId: number = CELO_MAINNET_CHAIN_ID
): Promise<{
  paymaster: `0x${string}`
  paymasterData: `0x${string}`
  paymasterVerificationGasLimit: bigint
  paymasterPostOpGasLimit: bigint
}> {
  const proxyUrl = getPaymasterProxyUrl(chainId)
  
  console.log('[PIMLICO] 📋 Calling pm_getPaymasterStubData for valid stub')
  
  // Build the userOp for Pimlico API
  const userOpForPimlico: Record<string, string | null> = {
    sender: args.sender,
    nonce: toHex(args.nonce),
    callData: args.callData,
    callGasLimit: args.callGasLimit ? toHex(args.callGasLimit) : '0x1',
    verificationGasLimit: args.verificationGasLimit ? toHex(args.verificationGasLimit) : '0x1',
    preVerificationGas: args.preVerificationGas ? toHex(args.preVerificationGas) : '0x1',
    maxFeePerGas: args.maxFeePerGas ? toHex(args.maxFeePerGas) : '0xb2d05e00', // ~3 gwei default
    maxPriorityFeePerGas: args.maxPriorityFeePerGas ? toHex(args.maxPriorityFeePerGas) : '0x1',
    signature: args.signature || '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c',
    // Include factory/factoryData for undeployed accounts
    ...(args.factory && { factory: args.factory }),
    ...(args.factoryData && { factoryData: args.factoryData }),
  }
  
  console.log('[PIMLICO] 📤 Stub request:', {
    sender: userOpForPimlico.sender,
    hasFactory: !!args.factory,
  })
  
  // Call Pimlico paymaster API - pm_getPaymasterStubData takes 3 params for v0.7
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterStubData',
      params: [
        userOpForPimlico,
        args.entryPointAddress || ENTRYPOINT_V07_ADDRESS,
        toHex(chainId), // chainId as hex string for v0.7
      ],
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[PIMLICO] ❌ Stub data API error:', response.status, errorText)
    throw new Error(`Pimlico stub data error: ${response.status} ${errorText}`)
  }
  
  const data = await response.json()
  
  if (data.error) {
    console.error('[PIMLICO] ❌ Stub data RPC error:', data.error)
    throw new Error(`Pimlico stub data error: ${data.error.message || JSON.stringify(data.error)}`)
  }
  
  console.log('[PIMLICO] ✅ Stub data response:', {
    paymaster: data.result.paymaster,
    paymasterDataLength: data.result.paymasterData?.length || 0,
  })
  
  // pm_getPaymasterStubData returns minimal stub - gas limits may be missing or invalid (0x1)
  // Use reasonable defaults for Pimlico Verifying Paymaster on Celo
  const DEFAULT_VERIFICATION_GAS_LIMIT = BigInt(150000) // 0x249f0
  const DEFAULT_POSTOP_GAS_LIMIT = BigInt(100000) // 0x186a0
  
  const rawVerificationGasLimit = toGasLimit(data.result.paymasterVerificationGasLimit)
  const rawPostOpGasLimit = toGasLimit(data.result.paymasterPostOpGasLimit)
  
  // Use defaults if Pimlico returned 0, 1, or missing values (these are stub placeholders, not real estimates)
  const verificationGasLimit = rawVerificationGasLimit > BigInt(1000) ? rawVerificationGasLimit : DEFAULT_VERIFICATION_GAS_LIMIT
  const postOpGasLimit = rawPostOpGasLimit > BigInt(1000) ? rawPostOpGasLimit : DEFAULT_POSTOP_GAS_LIMIT
  
  return {
    paymaster: data.result.paymaster as `0x${string}`,
    paymasterData: (data.result.paymasterData || '0x') as `0x${string}`,
    paymasterVerificationGasLimit: verificationGasLimit,
    paymasterPostOpGasLimit: postOpGasLimit,
  }
}

/**
 * Crea la configuración del paymaster para ZeroDev SDK
 * 
 * Esta función retorna un objeto compatible con createKernelAccountClient({paymaster: ...})
 * Proporciona:
 * - getPaymasterStubData: Llama a Pimlico para obtener stub data válido (necesario para cuentas nuevas)
 * - getPaymasterData: Llama a Pimlico para obtener el sponsorship real
 * 
 * IMPORTANTE: Para cuentas nuevas (no deployadas), el stub data también debe venir de Pimlico
 * para que la simulación funcione correctamente. Esto resuelve el error AA21.
 * 
 * @param chainId - Chain ID para el paymaster (default: Celo Mainnet)
 * @returns Objeto de configuración del paymaster compatible con ZeroDev SDK
 */
export function createPimlicoPaymasterConfig(chainId: number = CELO_MAINNET_CHAIN_ID) {
  return {
    /**
     * getPaymasterStubData es llamado durante la estimación de gas.
     * Llama a Pimlico para obtener stub data válido - necesario para cuentas nuevas.
     */
    getPaymasterStubData: async (args: PaymasterDataArgs) => {
      console.log('[PIMLICO] 📋 getPaymasterStubData called - getting valid stub from Pimlico')
      
      try {
        // Call Pimlico to get valid stub data
        // This is required for new accounts (with factory/factoryData) to pass simulation
        const stubResponse = await callPimlicoStubData(args, chainId)
        
        console.log('[PIMLICO] 📋 Returning Pimlico stub data:', {
          paymaster: stubResponse.paymaster,
          paymasterDataLength: stubResponse.paymasterData.length,
          paymasterVerificationGasLimit: stubResponse.paymasterVerificationGasLimit.toString(),
        })
        
        return stubResponse
      } catch (error) {
        console.error('[PIMLICO] ⚠️ Failed to get stub from Pimlico, using fallback:', error)
        
        // Fallback to static stub data (may not work for new accounts)
        return {
          paymaster: PIMLICO_PAYMASTER_ADDRESS as `0x${string}`,
          paymasterData: '0x01000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001c' as `0x${string}`,
          paymasterVerificationGasLimit: BigInt(150000),
          paymasterPostOpGasLimit: BigInt(100000),
        }
      }
    },
    
    /**
     * getPaymasterData es llamado para obtener el sponsorship real antes de enviar.
     * Este SÍ llama a Pimlico a través del proxy seguro.
     */
    getPaymasterData: async (args: PaymasterDataArgs) => {
      console.log('[PIMLICO] 💰 getPaymasterData called - getting sponsorship from Pimlico')
      
      const result = await callPimlicoPaymaster(args, chainId)
      
      // CRITICAL FIX: Return ALL gas limits from Pimlico
      // This ensures the final UserOp matches the signed values (AA33 fix)
      const paymasterReturn = {
        paymaster: result.paymaster as `0x${string}`,
        paymasterData: (result.paymasterData || '0x') as `0x${string}`,
        paymasterVerificationGasLimit: toGasLimit(result.paymasterVerificationGasLimit),
        paymasterPostOpGasLimit: toGasLimit(result.paymasterPostOpGasLimit),
        // Include gas limits if Pimlico provided them (ensures signature matches)
        ...(result.callGasLimit && { callGasLimit: toGasLimit(result.callGasLimit) }),
        ...(result.verificationGasLimit && { verificationGasLimit: toGasLimit(result.verificationGasLimit) }),
        ...(result.preVerificationGas && { preVerificationGas: toGasLimit(result.preVerificationGas) }),
      }
      
      console.log('[PIMLICO] 💾 Returning paymaster data:', {
        paymaster: paymasterReturn.paymaster,
        paymasterVerificationGasLimit: paymasterReturn.paymasterVerificationGasLimit.toString(),
        paymasterPostOpGasLimit: paymasterReturn.paymasterPostOpGasLimit.toString(),
      })
      
      return paymasterReturn
    },
  }
}

/**
 * Verifica si el paymaster tiene saldo suficiente
 * Útil para diagnóstico
 */
export async function checkPaymasterBalance(chainId: number = CELO_MAINNET_CHAIN_ID): Promise<{
  hasBalance: boolean
  message: string
}> {
  try {
    const proxyUrl = getPaymasterProxyUrl(chainId)
    
    // Make a simple request to check if the paymaster is working
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'pimlico_getUserOperationGasPrice',
        params: [],
      }),
    })
    
    if (!response.ok) {
      return {
        hasBalance: false,
        message: `Paymaster proxy error: ${response.status}`,
      }
    }
    
    const data = await response.json()
    
    if (data.error) {
      return {
        hasBalance: false,
        message: `Paymaster RPC error: ${data.error.message}`,
      }
    }
    
    return {
      hasBalance: true,
      message: 'Paymaster is operational',
    }
  } catch (error) {
    return {
      hasBalance: false,
      message: `Paymaster check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Información de debug del paymaster
 */
export const PAYMASTER_DEBUG_INFO = {
  proxyEndpoint: '/api/pimlico/paymaster',
  bundlerEndpoint: '/api/pimlico/bundler',
  paymasterAddress: PIMLICO_PAYMASTER_ADDRESS,
  entryPointAddress: ENTRYPOINT_V07_ADDRESS,
  supportedChains: [
    { id: 42220, name: 'Celo Mainnet' },
    { id: 44787, name: 'Celo Alfajores (Testnet)' },
  ],
  supportedMethods: [
    'pm_getPaymasterStubData',
    'pm_getPaymasterData', 
    'pm_sponsorUserOperation',
    'pimlico_getUserOperationGasPrice',
  ],
}

