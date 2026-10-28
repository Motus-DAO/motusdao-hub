import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { isAllowedPimlicoMethod } from '@/lib/platform-spend-guard'

/**
 * API Route para proxy de Pimlico Paymaster
 * Mantiene la API key segura en el servidor
 * 
 * Soporta los siguientes métodos de ERC-4337 v0.7:
 * - pm_getPaymasterStubData: Para estimación de gas (requiere 3 params: userOp, entryPoint, context/chainId)
 * - pm_getPaymasterData: Para datos finales del paymaster (requiere 3 params)
 * - pm_sponsorUserOperation: Método legacy/combinado (requiere 2 params: userOp, entryPoint)
 * 
 * IMPORTANTE: Los métodos pm_getPaymaster* de v0.7 requieren params[2] que es el context/chainId.
 * Este proxy añade automáticamente el chainId si falta.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession(request)

    const pimlicoApiKey = process.env.PIMLICO_API_KEY // Sin NEXT_PUBLIC_ - solo servidor
    
    if (!pimlicoApiKey) {
      console.error('[PIMLICO PAYMASTER PROXY] ❌ PIMLICO_API_KEY not configured in environment variables')
      return NextResponse.json(
        { 
          jsonrpc: '2.0',
          id: 1,
          error: { 
            code: -32000,
            message: 'Pimlico API key not configured. Please set PIMLICO_API_KEY in Vercel environment variables.' 
          }
        },
        { status: 500 }
      )
    }
    
    // Log that API key is present (but not the actual key)
    console.log('[PIMLICO PAYMASTER PROXY] ✅ API key found, length:', pimlicoApiKey.length)

    const body = await request.json()
    
    // Get chain ID from URL query params or body - NEEDED for v0.7 methods
    // Official Pimlico client calls /api/pimlico/paymaster?chainId=42220
    const url = new URL(request.url)
    const chainId = url.searchParams.get('chainId') || body.chainId || '42220' // Default to Celo Mainnet
    const chainIdNumber = parseInt(chainId, 10)
    
    // Support both JSON-RPC format (from official Pimlico client) and custom format (legacy)
    let method: string
    let params: unknown[]
    let rpcId: number | string
    
    if (body.method && body.params) {
      // JSON-RPC format from official Pimlico client
      method = body.method
      params = [...(body.params || [])] // Clone the params array
      rpcId = body.id || 1
      console.log('[PIMLICO PAYMASTER PROXY] 📋 Received JSON-RPC request:', { method, paramsCount: params.length })
      
      // CRITICAL FIX: v0.7 paymaster methods require 3 params
      // params[0]: userOp (partial or full)
      // params[1]: entryPoint address
      // params[2]: context (chainId or context object)
      // If params[2] is missing, add the chainId
      if (method === 'pm_getPaymasterStubData' || method === 'pm_getPaymasterData') {
        // Ensure we have exactly 3 params
        if (params.length < 3) {
          console.log('[PIMLICO PAYMASTER PROXY] 🔧 Adding missing chainId context (required for v0.7)')
          // Add the chainId as context (Pimlico accepts either number or hex string)
          params[2] = `0x${chainIdNumber.toString(16)}`
          console.log('[PIMLICO PAYMASTER PROXY] 📋 Updated params:', { 
            paramsCount: params.length, 
            context: params[2] 
          })
        } else if (params[2] === null || params[2] === undefined) {
          // params[2] exists but is null/undefined
          params[2] = `0x${chainIdNumber.toString(16)}`
          console.log('[PIMLICO PAYMASTER PROXY] 🔧 Replaced null/undefined context with chainId')
        }
      }
    } else if (body.chainId && body.userOperation) {
      // Legacy custom format - convert to JSON-RPC
      method = 'pm_sponsorUserOperation'
      const entryPointAddress = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
      params = [body.userOperation, entryPointAddress]
      rpcId = 1
      console.log('[PIMLICO PAYMASTER PROXY] 📋 Received legacy format, converting to JSON-RPC')
    } else {
      return NextResponse.json(
        { 
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32602,
            message: 'Invalid request format. Expected JSON-RPC or { chainId, userOperation }'
          }
        },
        { status: 400 }
      )
    }

    if (!isAllowedPimlicoMethod(method)) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: rpcId,
          error: {
            code: -32601,
            message: 'Method not allowed on this proxy',
          },
        },
        { status: 403 }
      )
    }

    // Pimlico API endpoint
    const pimlicoApiUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${pimlicoApiKey}`

    console.log('[PIMLICO PAYMASTER PROXY] 📤 Forwarding to Pimlico:', { method, chainId, paramsCount: params.length })

    // Forward JSON-RPC request to Pimlico
    const response = await fetch(pimlicoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: rpcId,
        method,
        params,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[PIMLICO PAYMASTER PROXY] ❌ HTTP error:', response.status, errorText)
      
      if (response.status === 401) {
        console.error('[PIMLICO PAYMASTER PROXY] ❌ 401 Unauthorized - API key may be invalid or expired')
        return NextResponse.json(
          { 
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32000,
              message: 'Pimlico API authentication failed (401). Please verify PIMLICO_API_KEY is correct and has access to chain ' + chainId
            }
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          jsonrpc: '2.0',
          id: rpcId,
          error: {
            code: -32000,
            message: `Pimlico API error: ${response.status} ${errorText}`
          }
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (data.error) {
      console.error('[PIMLICO PAYMASTER PROXY] ❌ RPC error:', data.error)
      return NextResponse.json(data, { status: 500 })
    }

    console.log('[PIMLICO PAYMASTER PROXY] ✅ Paymaster response:', {
      method,
      hasResult: !!data.result,
      hasPaymaster: !!data.result?.paymaster,
      hasPaymasterData: !!data.result?.paymasterData,
      paymasterAddress: data.result?.paymaster || 'none',
      paymasterDataLength: data.result?.paymasterData?.length || 0,
      // v0.7 paymaster gas limits
      paymasterVerificationGasLimit: data.result?.paymasterVerificationGasLimit,
      paymasterPostOpGasLimit: data.result?.paymasterPostOpGasLimit,
    })

    // Return the full JSON-RPC response (the SDK expects this format)
    return NextResponse.json(data)
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('[PIMLICO PAYMASTER PROXY] Error:', error)
    return NextResponse.json(
      { 
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}


