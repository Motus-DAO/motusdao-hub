import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route para proxy de Pimlico Bundler
 * Mantiene la API key segura en el servidor
 * El bundler también requiere autenticación con API key
 * 
 * This proxy accepts JSON-RPC requests from viem and forwards them to Pimlico
 * with the API key added as a query parameter.
 */
export async function POST(request: NextRequest) {
  try {
    const pimlicoApiKey = process.env.PIMLICO_API_KEY // Sin NEXT_PUBLIC_ - solo servidor
    
    if (!pimlicoApiKey) {
      console.error('[PIMLICO BUNDLER PROXY] ❌ PIMLICO_API_KEY not configured in environment variables')
      return NextResponse.json(
        { 
          jsonrpc: '2.0',
          id: null,
          error: { 
            code: -32000, 
            message: 'Pimlico API key not configured. Please set PIMLICO_API_KEY in Vercel environment variables.' 
          }
        },
        { status: 500 }
      )
    }
    
    // Log that API key is present (but not the actual key)
    console.log('[PIMLICO BUNDLER PROXY] ✅ API key found, length:', pimlicoApiKey.length)

    // Parse the request body - could be either our custom format or viem's JSON-RPC format
    const body = await request.json()
    
    // Extract chainId - either from body.chainId (our format) or infer from request
    // For Celo Mainnet, chainId is 42220
    const chainId = body.chainId || 42220
    
    // Check if this is a JSON-RPC request from viem (has jsonrpc field)
    // or our custom format (has chainId, method, params separately)
    interface JsonRpcRequest {
      jsonrpc: string
      id: number | string | null
      method: string
      params?: unknown[]
    }
    
    let jsonRpcRequest: JsonRpcRequest
    
    if (body.jsonrpc) {
      // This is a JSON-RPC request from viem - forward it as-is
      jsonRpcRequest = body as JsonRpcRequest
      
      // CRITICAL: EntryPoint v0.7 uses unpacked format, but viem/ZeroDev may send packed format
      // Convert paymasterAndData (packed v0.6) → paymaster/paymasterData (unpacked v0.7)
      if ((jsonRpcRequest.method === 'eth_estimateUserOperationGas' || 
           jsonRpcRequest.method === 'eth_sendUserOperation') &&
          jsonRpcRequest.params && 
          Array.isArray(jsonRpcRequest.params) && 
          jsonRpcRequest.params.length > 0) {
        const userOp = jsonRpcRequest.params[0] as Record<string, unknown>
        if (userOp && typeof userOp === 'object') {
          // For gas estimation with paymaster, DO NOT remove paymaster fields!
          // EntryPoint v0.7 requires paymaster fields to correctly simulate sponsored operations.
          // Previous code removed paymaster fields which caused AA21 error.
          if (jsonRpcRequest.method === 'eth_estimateUserOperationGas') {
            // KEEP paymaster fields for estimation - Pimlico needs them
            // Only remove paymasterAndData if unpacked fields exist (v0.6 → v0.7 cleanup)
            if ('paymasterAndData' in userOp && 'paymaster' in userOp && userOp.paymaster) {
              console.log('[PIMLICO BUNDLER PROXY] 🔧 Removing redundant paymasterAndData (keeping v0.7 unpacked fields)')
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { paymasterAndData: _paymasterAndData, ...userOpClean } = userOp
              jsonRpcRequest.params[0] = userOpClean
            }
          }
          // For eth_sendUserOperation, ensure proper v0.7 format
          else if (jsonRpcRequest.method === 'eth_sendUserOperation') {
            // CRITICAL: Check if UserOp has v0.7 unpacked format (paymaster field exists)
            // If yes, we MUST remove paymasterAndData field (even if empty) because Pimlico rejects it
            if ('paymaster' in userOp && userOp.paymaster) {
              console.log('[PIMLICO BUNDLER PROXY] ✅ UserOp has v0.7 unpacked paymaster fields')
              
              // CRITICAL: Remove paymasterAndData if it exists alongside unpacked fields
              // Viem/ZeroDev adds both, but Pimlico v0.7 API REJECTS UserOps with paymasterAndData
              if ('paymasterAndData' in userOp) {
                console.log('[PIMLICO BUNDLER PROXY] 🔧 Removing paymasterAndData from v0.7 unpacked UserOp')
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { paymasterAndData: _paymasterAndData, ...userOpClean } = userOp
                jsonRpcRequest.params[0] = userOpClean
              }
              
              // Verify gas limits are present in the cleaned UserOp
              const finalUserOp = jsonRpcRequest.params[0] as Record<string, unknown>
              if (!finalUserOp.paymasterVerificationGasLimit || !finalUserOp.paymasterPostOpGasLimit) {
                console.warn('[PIMLICO BUNDLER PROXY] ⚠️ Missing paymaster gas limits, adding defaults')
                jsonRpcRequest.params[0] = {
                  ...finalUserOp,
                  paymasterVerificationGasLimit: finalUserOp.paymasterVerificationGasLimit || '0x0',
                  paymasterPostOpGasLimit: finalUserOp.paymasterPostOpGasLimit || '0x0',
                }
              }
              
              console.log('[PIMLICO BUNDLER PROXY] 📋 Final paymaster fields:', {
                paymaster: finalUserOp.paymaster,
                paymasterDataLength: (finalUserOp.paymasterData as string)?.length || 0,
                paymasterVerificationGasLimit: finalUserOp.paymasterVerificationGasLimit,
                paymasterPostOpGasLimit: finalUserOp.paymasterPostOpGasLimit,
                hasPaymasterAndData: 'paymasterAndData' in finalUserOp,
              })
              console.log('[PIMLICO BUNDLER PROXY] 📋 Gas limits in final UserOp:', {
                callGasLimit: finalUserOp.callGasLimit,
                verificationGasLimit: finalUserOp.verificationGasLimit,
                preVerificationGas: finalUserOp.preVerificationGas,
              })
            }
            // If only packed format exists (no paymaster field), convert it to unpacked
            else if ('paymasterAndData' in userOp) {
              const paymasterAndData = userOp.paymasterAndData as string
              if (paymasterAndData && paymasterAndData !== '0x' && paymasterAndData.length > 42) {
                console.log('[PIMLICO BUNDLER PROXY] 🔧 Converting packed paymasterAndData to unpacked v0.7 format')
                console.log('[PIMLICO BUNDLER PROXY] 📋 UserOp gas limits before conversion:', {
                  hasVerificationGasLimit: !!userOp.paymasterVerificationGasLimit,
                  verificationGasLimit: userOp.paymasterVerificationGasLimit,
                  hasPostOpGasLimit: !!userOp.paymasterPostOpGasLimit,
                  postOpGasLimit: userOp.paymasterPostOpGasLimit,
                })
                
                // paymasterAndData = paymaster (20 bytes / 40 hex chars) + paymasterData (rest)
                const paymaster = '0x' + paymasterAndData.slice(2, 42)  // First 20 bytes
                const paymasterData = '0x' + paymasterAndData.slice(42)  // Rest
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { paymasterAndData: _paymasterAndData, ...userOpUnpacked } = userOp
                
                // CRITICAL: Use gas limits from userOp if they exist (should be set by getPaymasterData)
                // Only default to '0x0' if they're truly missing
                jsonRpcRequest.params[0] = {
                  ...userOpUnpacked,
                  paymaster,
                  paymasterData,
                  // Keep gas limits from userOp - they should be set by getPaymasterData
                  paymasterVerificationGasLimit: userOp.paymasterVerificationGasLimit || '0x0',
                  paymasterPostOpGasLimit: userOp.paymasterPostOpGasLimit || '0x0',
                }
                const convertedUserOp = jsonRpcRequest.params[0] as Record<string, unknown>
                console.log('[PIMLICO BUNDLER PROXY] ✅ Converted to unpacked format:', {
                  paymaster,
                  paymasterDataLength: paymasterData.length,
                  paymasterVerificationGasLimit: convertedUserOp.paymasterVerificationGasLimit,
                  paymasterPostOpGasLimit: convertedUserOp.paymasterPostOpGasLimit,
                })
              }
            }
          }
        }
      }
    } else if (body.method) {
      // This is our custom format - convert to JSON-RPC
      jsonRpcRequest = {
        jsonrpc: '2.0',
        id: body.id || 1,
        method: body.method,
        params: body.params || [],
      }
    } else {
      return NextResponse.json(
        { 
          jsonrpc: '2.0',
          id: null,
          error: { 
            code: -32600, 
            message: 'Invalid request format' 
          }
        },
        { status: 400 }
      )
    }

    // Pimlico Bundler API endpoint (requires API key)
    const pimlicoApiUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${pimlicoApiKey}`

    // Forward JSON-RPC request to Pimlico bundler
    const response = await fetch(pimlicoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonRpcRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[PIMLICO BUNDLER PROXY] ❌ HTTP error:', response.status, errorText)
      
      // Provide helpful error message for 401 Unauthorized
      if (response.status === 401) {
        console.error('[PIMLICO BUNDLER PROXY] ❌ 401 Unauthorized - API key may be invalid or expired')
        console.error('[PIMLICO BUNDLER PROXY] 💡 Check: 1) API key is correct in Vercel, 2) API key is active in Pimlico dashboard, 3) API key has access to Celo Mainnet (chain 42220)')
        return NextResponse.json(
          { 
            jsonrpc: '2.0',
            id: jsonRpcRequest.id,
            error: { 
              code: -32001, 
              message: 'Pimlico API authentication failed (401). Please verify PIMLICO_API_KEY is correct and has access to Celo Mainnet (chain 42220). Check your Pimlico dashboard: https://dashboard.pimlico.io' 
            }
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          jsonrpc: '2.0',
          id: jsonRpcRequest.id,
          error: { 
            code: response.status, 
            message: `Pimlico bundler API error: ${response.status} ${errorText}` 
          }
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Return the full JSON-RPC response (viem expects this format)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[PIMLICO BUNDLER PROXY] Error:', error)
    return NextResponse.json(
      { 
        jsonrpc: '2.0',
        id: null,
        error: { 
          code: -32603, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      },
      { status: 500 }
    )
  }
}

