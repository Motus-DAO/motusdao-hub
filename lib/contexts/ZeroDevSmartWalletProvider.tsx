'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  createKernelAccount, 
  createKernelAccountClient,
  type KernelAccountClient
} from '@zerodev/sdk'
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants'
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator'
import { createPublicClient, createWalletClient, custom, http, type Address, type WalletClient, type Account, type Transport, type Chain } from 'viem'
import { celoMainnet } from '@/lib/celo'
import { createPimlicoPaymasterConfig, PAYMASTER_DEBUG_INFO } from '@/lib/pimlico-paymaster'
import { useWaaP, useWaaPWallets, useWaaPProvider } from '@/lib/contexts/WaaPProvider'

// FORZAR Celo Mainnet - no importa qué diga el dashboard
const FORCED_CHAIN = celoMainnet // Chain ID 42220

interface ZeroDevContextType {
  kernelClient: KernelAccountClient | null
  smartAccountAddress: Address | null
  isInitializing: boolean
  error: string | null
}

const ZeroDevContext = createContext<ZeroDevContextType>({
  kernelClient: null,
  smartAccountAddress: null,
  isInitializing: false,
  error: null,
})

export function useSmartAccount() {
  return useContext(ZeroDevContext)
}

interface ZeroDevSmartWalletProviderProps {
  children: ReactNode
  zeroDevProjectId: string
}

export function ZeroDevSmartWalletProvider({ 
  children, 
  zeroDevProjectId 
}: ZeroDevSmartWalletProviderProps) {
  // WaaP hooks (replaces Privy hooks)
  const { authenticated } = useWaaP()
  const { wallets } = useWaaPWallets()
  const { provider: waapProvider, isReady: isWaaPReady } = useWaaPProvider()
  
  const [kernelClient, setKernelClient] = useState<KernelAccountClient | null>(null)
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Log component mount and props
  console.log('[ZERODEV] Provider mounted/updated:', {
    hasProjectId: !!zeroDevProjectId,
    projectId: zeroDevProjectId ? `${zeroDevProjectId.substring(0, 8)}...` : 'missing',
    authenticated,
    walletsCount: wallets?.length || 0,
    isWaaPReady,
  })

  useEffect(() => {
    console.log('[ZERODEV] ⚡ useEffect triggered')
    const initializeSmartWallet = async () => {
      console.log('[ZERODEV] Effect triggered:', { authenticated, walletsCount: wallets?.length, wallets })
      
      if (!authenticated) {
        console.log('[ZERODEV] Not authenticated, skipping initialization')
        setKernelClient(null)
        setSmartAccountAddress(null)
        setIsInitializing(false)
        return
      }
      
      if (!wallets || wallets.length === 0) {
        console.log('[ZERODEV] No wallets available yet, waiting...')
        setKernelClient(null)
        setSmartAccountAddress(null)
        setIsInitializing(false)
        return
      }

      if (!waapProvider) {
        console.log('[ZERODEV] WaaP provider not ready, waiting...')
        setIsInitializing(false)
        return
      }

      try {
        setIsInitializing(true)
        setError(null)
        console.log('[ZERODEV] Initializing smart wallet with WaaP wallet...')
        console.log('[ZERODEV] Using Celo Mainnet (Chain ID: 42220)')
        
        // Get EntryPoint v0.7 from ZeroDev SDK
        const entryPoint = getEntryPoint('0.7')
        
        // Get the WaaP wallet (EOA)
        const waapWallet = wallets.find((wallet) => wallet.walletClientType === 'waap')
        const externalWallet = wallets.find((wallet) => wallet.walletClientType === 'external')
        
        const walletToUse = waapWallet || externalWallet
        if (!walletToUse) {
          console.log('[ZERODEV] No wallet found for smart account creation')
          setIsInitializing(false)
          return
        }
        
        const walletTypeLabel = walletToUse.walletClientType === 'waap' ? 'WaaP embedded' : 'External (MetaMask, etc.)'
        console.log('[ZERODEV] Found EOA wallet:', {
          address: walletToUse.address,
          type: walletTypeLabel,
          chainId: walletToUse.chainId
        })
        console.log(`ℹ️ Using ${walletTypeLabel} wallet as EOA:`, walletToUse.address)
        
        // Log all available wallets for debugging
        console.log('[ZERODEV] All available wallets:', wallets.map(w => ({
          address: w.address,
          type: w.walletClientType,
          chainId: w.chainId
        })))
        
        // Save EOA address for debugging
        console.log('[ZERODEV] 🔑 EOA (WaaP Wallet) Address:', walletToUse.address)
        console.log('[ZERODEV] ⚠️ Si esta EOA cambia entre sesiones, tu smart wallet cambiará también!')
        
        // Use WaaP's EIP-1193 provider
        const provider = waapProvider
        if (!provider) {
          throw new Error('Failed to get Ethereum provider from WaaP')
        }

        console.log('[ZERODEV] Creating ECDSA Kernel smart account...')
        
        // Create public client for blockchain interactions
        const publicClient = createPublicClient({
          chain: FORCED_CHAIN,
          transport: http(),
        })
        
        console.log('[ZERODEV] Creating ECDSA validator...')
        
        // Create wallet client with account for signing
        // Using WaaP's EIP-1193 provider with viem's custom transport
        const walletClient = createWalletClient({
          account: walletToUse.address as `0x${string}`,
          chain: FORCED_CHAIN,
          transport: custom(provider as Parameters<typeof custom>[0]),
        }) as WalletClient<Transport, Chain, Account>
        
        // Create ECDSA validator using ZeroDev SDK
        // WalletClient with Account is a valid Signer type
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
          signer: walletClient,
          entryPoint: entryPoint,
          kernelVersion: KERNEL_V3_1,
        })
        
        console.log('[ZERODEV] Creating Kernel account...')
        
        // Create Kernel account using ZeroDev SDK with proper version for EntryPoint v0.7
        // Using index: 0 to ensure deterministic address for the same owner
        // This ensures the same EOA always gets the same smart wallet address
        const account = await createKernelAccount(publicClient, {
          plugins: {
            sudo: ecdsaValidator,
          },
          entryPoint: entryPoint,
          kernelVersion: KERNEL_V3_1,
          index: BigInt(0), // Use index 0 for deterministic address - same owner = same address
        })
        
        console.log('[ZERODEV] ✅ Smart account created with index 0 (deterministic)')
        console.log('[ZERODEV] ═════════════════════════════════════════════════════')
        console.log('[ZERODEV] 🔑 EOA (WaaP Wallet - signer/owner):', walletToUse.address)
        console.log('[ZERODEV] 🏦 Smart Wallet (sends transactions):', account.address)
        console.log('[ZERODEV] ═════════════════════════════════════════════════════')
        console.log('[ZERODEV] 💡 The SMART WALLET generates UserOperations')
        console.log('[ZERODEV] 💡 The EOA only signs as the wallet owner')
        console.log('[ZERODEV] 💡 Gas is sponsored by Pimlico paymaster')
        console.log('[ZERODEV] ═════════════════════════════════════════════════════')

        // Bundler Configuration: Smart routing based on method type
        // ZeroDev SDK uses some ZeroDev-specific methods (zd_*) that Pimlico doesn't support
        // Solution: Route ZeroDev-specific methods to ZeroDev bundler, standard ERC-4337 methods to Pimlico
        // This allows us to use Pimlico paymaster while maintaining compatibility with ZeroDev SDK
        
        // ZeroDev bundler URL
        const zeroDevBundlerUrl = `https://rpc.zerodev.app/api/v3/${zeroDevProjectId}/chain/${FORCED_CHAIN.id}`
        
        // Create smart bundler transport that routes methods intelligently
        const bundlerTransport = http('/api/pimlico/bundler', {
          fetchFn: async (url, options) => {
            // Parse the JSON-RPC request body to determine routing
            let requestBody: { method?: string; params?: unknown[]; jsonrpc?: string; id?: number | string | null } = {}
            let shouldUseZeroDevBundler = false
            const originalBody = options?.body
            
            if (options?.body) {
              try {
                requestBody = JSON.parse(options.body as string)
                const method = requestBody.method || ''
                
                // Smart routing for ERC-4337 methods:
                // - ZeroDev bundler: handles Kernel-specific methods AND gas estimation
                //   (ZeroDev knows how to simulate Kernel accounts, Pimlico may not)
                // - Pimlico bundler: handles eth_sendUserOperation with paymaster
                //   (We want Pimlico to execute the UserOp so paymaster works)
                
                if (method.startsWith('zd_') || 
                    method.includes('zerodev') ||
                    method === 'eth_estimateUserOperationGas') {
                  // Use ZeroDev for gas estimation - it knows how to handle Kernel wallets
                  // including undeployed wallets with factory/factoryData
                  shouldUseZeroDevBundler = true
                  console.log('[ZERODEV] 🔀 Routing to ZeroDev bundler:', method)
                } else {
                  // Route eth_sendUserOperation and other methods to Pimlico bundler
                  // This ensures the paymaster sponsorship is applied correctly
                  console.log('[ZERODEV] 📤 Routing to Pimlico bundler:', method)
                }
              } catch {
                // If parsing fails, default to ZeroDev for safety
                console.log('[ZERODEV] ⚠️ Could not parse request, defaulting to ZeroDev bundler')
                shouldUseZeroDevBundler = true
              }
            }
            
            // Route to appropriate bundler
            const targetUrl = shouldUseZeroDevBundler 
              ? zeroDevBundlerUrl 
              : '/api/pimlico/bundler'
            
            // Use modified request body if we stripped paymasterAndData, otherwise use original
            const requestBodyToSend = (shouldUseZeroDevBundler && requestBody.jsonrpc) 
              ? JSON.stringify(requestBody)
              : originalBody
            
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: requestBodyToSend,
            })

            if (!response.ok) {
              let errorData: { error?: { message?: string } | string } = {}
              try {
                errorData = await response.json()
              } catch {
                // If JSON parsing fails, try to get text
                const errorText = await response.text()
                errorData = { error: errorText }
              }
              console.error('[ZERODEV] ❌ Bundler error:', response.status, errorData)
              
              // Check for API key configuration error
              let errorMessage: string = 'Unknown error'
              if (errorData.error) {
                if (typeof errorData.error === 'string') {
                  errorMessage = errorData.error
                } else if (errorData.error.message) {
                  errorMessage = errorData.error.message
                }
              }
              
              if (errorMessage.includes('Pimlico API key not configured') || 
                  errorMessage.includes('PIMLICO_API_KEY not configured')) {
                throw new Error(
                  'PIMLICO_API_KEY not configured in Vercel environment variables. ' +
                  'Pimlico bundler is REQUIRED for production. ' +
                  'Please add PIMLICO_API_KEY to your Vercel project settings.'
                )
              }
              
              throw new Error(`Bundler error: ${response.status} ${errorMessage}`)
            }

            return response
          },
        })
        
        console.log('[ZERODEV] 📦 Using smart bundler routing:')
        console.log('[ZERODEV]   - Gas estimation (eth_estimateUserOperationGas) → ZeroDev bundler')
        console.log('[ZERODEV]   - Execution (eth_sendUserOperation) → Pimlico bundler')
        console.log('[ZERODEV]   - ZeroDev-specific methods (zd_*) → ZeroDev bundler')
        console.log('[ZERODEV]   - Paymaster: Pimlico (REQUIRED for mainnet)')
        console.log('[ZERODEV] 🔒 Bundler API keys are secure on server, not exposed to client')
        
        // Paymaster Configuration: Pimlico is REQUIRED (ZeroDev paymaster doesn't work on mainnet with free plan)
        // Using centralized Pimlico paymaster configuration from lib/pimlico-paymaster.ts
        console.log('[ZERODEV] 🔧 Setting up Pimlico paymaster...')
        console.log('[ZERODEV] 📦 Using centralized config from lib/pimlico-paymaster.ts')
        console.log('[ZERODEV] ℹ️ Smart wallets created by ZeroDev, paymaster by Pimlico')
        console.log('[ZERODEV] 🔒 API key is secure on server via', PAYMASTER_DEBUG_INFO.proxyEndpoint)
        
        // Create paymaster config using the centralized utility
        const customPaymaster = createPimlicoPaymasterConfig(FORCED_CHAIN.id)
        
        console.log('[ZERODEV] ✅ Pimlico paymaster configured', {
          chainId: FORCED_CHAIN.id,
          entryPoint: '0.7',
          proxyUrl: PAYMASTER_DEBUG_INFO.proxyEndpoint,
          paymasterAddress: PAYMASTER_DEBUG_INFO.paymasterAddress,
        })
        
        console.log('[ZERODEV] Creating Kernel account client...')
        console.log('[ZERODEV] Paymaster type: Pimlico (REQUIRED)')
        
        // Create Kernel client using ZeroDev SDK with custom paymaster
        // The paymaster object with getPaymasterData/getPaymasterStubData is the correct format
        const client = createKernelAccountClient({
          account,
          chain: FORCED_CHAIN,
          bundlerTransport: bundlerTransport, // Pimlico bundler via secure proxy
          paymaster: customPaymaster,
          client: publicClient,
        })
        
        console.log('[ZERODEV] ✅ Paymaster configured - gasless transactions enabled', {
          paymaster: 'Pimlico (REQUIRED - ZeroDev does not work on mainnet)',
          smartWallets: 'ZeroDev Kernel',
          bundler: 'Smart routing (zd_* → ZeroDev, standard ERC-4337 → Pimlico)',
          chainId: FORCED_CHAIN.id,
          chainName: FORCED_CHAIN.name,
          eoaProvider: 'WaaP (Human.tech)',
          note: 'Migrated from Privy to WaaP for EOA creation',
        })
        
        console.log("[ZERODEV] ✅ Smart account client created:", client.account.address)
        
        // Try to get chain ID to verify bundler connection
        // This will fail if PIMLICO_API_KEY is not configured
        try {
          const chainId = await client.getChainId()
          console.log("[ZERODEV] ✅ Chain ID verified:", chainId)
        } catch (chainIdError) {
          console.error("[ZERODEV] ⚠️ Failed to get chain ID (bundler connection test):", chainIdError)
          // Don't fail the entire initialization - the client is still created
          // The error will surface when trying to send a transaction
          if (chainIdError instanceof Error && 
              (chainIdError.message.includes('401') || 
               chainIdError.message.includes('Unauthorized') ||
               chainIdError.message.includes('PIMLICO_API_KEY'))) {
            console.error("[ZERODEV] ❌ Pimlico API key issue detected")
            console.error("[ZERODEV] 💡 Please verify PIMLICO_API_KEY is set correctly in Vercel environment variables")
            console.error("[ZERODEV] 💡 Check: https://dashboard.pimlico.io to verify your API key is active")
          }
        }

        setKernelClient(client)
        setSmartAccountAddress(account.address)
      } catch (err) {
        console.error("[ZERODEV] ❌ Error initializing smart wallet:", err)
        console.error("[ZERODEV] Error details:", {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          name: err instanceof Error ? err.name : undefined,
        })
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsInitializing(false)
      }
    }

    // Always try to initialize - the function will handle missing dependencies
    initializeSmartWallet()
  }, [authenticated, wallets, zeroDevProjectId, waapProvider, isWaaPReady])

  return (
    <ZeroDevContext.Provider
      value={{
        kernelClient,
        smartAccountAddress,
        isInitializing,
        error,
      }}
    >
      {children}
    </ZeroDevContext.Provider>
  )
}
