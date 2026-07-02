# Deep Analysis: Wallet Handling - Privy vs ZeroDev

## Executive Summary

This analysis examines the current wallet handling implementation, identifying what works with Privy, what works with ZeroDev, and what needs to be changed. **Critical finding**: Smart wallets work locally but fail on Vercel, indicating environment or configuration issues.

---

## 1. Current Architecture Overview

### Dual Wallet System

The codebase implements a **hybrid approach** using two wallet systems:

1. **Privy Embedded Wallets** (EOA - Externally Owned Accounts)
   - Created automatically on email login
   - Addresses typically start with `0x1F93...` (Privy's deterministic prefix)
   - Used as signers for smart wallets
   - Handles authentication and basic wallet operations

2. **ZeroDev Smart Wallets** (Contract Accounts)
   - Created via ZeroDev SDK using Kernel v3.1
   - Uses ECDSA validator with Privy wallet as signer
   - Supports gasless transactions via ZeroDev paymaster
   - Address is deterministic based on EOA owner + index

### Component Hierarchy

```
PrivyProviderWrapper
  └── PrivyProvider (authentication + embedded wallets)
      └── ZeroDevSmartWalletProvider (smart wallet creation)
          └── App Components
```

---

## 2. What Works with Privy ✅

### 2.1 Authentication & Embedded Wallets

**Location**: `components/PrivyProviderWrapper.tsx`

```12:68:components/PrivyProviderWrapper.tsx
export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  // ZeroDev Project ID - can use Alfajores project ID with Celo Mainnet
  const zeroDevProjectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || 'e46f4ac3-404e-42fc-a3d3-1c75846538a8'

  return (
    <div suppressHydrationWarning>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        config={{
          appearance: {
            theme: 'dark',
            accentColor: '#8B5CF6',
            logo: '/logo.svg',
            showWalletLoginFirst: false,
            walletList: ['metamask', 'wallet_connect', 'coinbase_wallet'],
          },
          embeddedWallets: { 
            createOnLogin: 'users-without-wallets',
          },
          loginMethods: ['email', 'wallet'],
          mfa: {
            noPromptOnMfaRequired: false,
          },
          // Celo Mainnet Configuration
          defaultChain: {
            id: 42220, // Celo mainnet
            name: 'Celo',
            network: 'celo',
            nativeCurrency: {
              name: 'Celo',
              symbol: 'CELO',
              decimals: 18,
            },
            rpcUrls: {
              default: {
                http: ['https://forno.celo.org'],
              },
              public: {
                http: ['https://forno.celo.org'],
              },
            },
            blockExplorers: {
              default: {
                name: 'Celo Explorer',
                url: 'https://explorer.celo.org',
              },
            },
          },
          legal: {
            termsAndConditionsUrl: '/terms',
            privacyPolicyUrl: '/privacy',
          },
        }}
      >
        <ZeroDevSmartWalletProvider zeroDevProjectId={zeroDevProjectId}>
          {children}
        </ZeroDevSmartWalletProvider>
      </PrivyProvider>
    </div>
  )
}
```

**What Works**:
- ✅ Email-based authentication
- ✅ Embedded wallet creation on login
- ✅ External wallet connections (MetaMask, WalletConnect, Coinbase)
- ✅ Celo Mainnet configuration
- ✅ User session management
- ✅ Multi-factor authentication support

### 2.2 Wallet Detection & Identification

**Location**: `lib/wallet-utils.ts`

```19:75:lib/wallet-utils.ts
export function identifySmartWallet(wallets: ConnectedWallet[]): ConnectedWallet | null {
  const privyWallets = wallets.filter(wallet => wallet.walletClientType === 'privy')
  
  if (privyWallets.length === 0) {
    console.log('🔍 No Privy wallets found')
    return null
  }

  // Log all wallets for debugging
  console.log('🔍 All Privy wallets:', privyWallets.map(w => ({
    address: w.address,
    chainId: w.chainId,
    walletClientType: w.walletClientType
  })))

  // When smart wallets are enabled, Privy creates:
  // 1. Embedded wallet (EOA) - address typically starts with 0x1F93... (Privy's deterministic prefix)
  // 2. Smart wallet (contract) - different address, not starting with 0x1F93...
  
  // Smart wallet is the one that is NOT the embedded wallet
  // We identify embedded wallet by the 0x1F93 prefix (Privy's deterministic address)
  const embeddedWallet = identifyEmbeddedWallet(privyWallets)
  
  console.log('🔍 Embedded wallet found:', embeddedWallet?.address)
  
  if (embeddedWallet && privyWallets.length > 1) {
    // If we have an embedded wallet and multiple wallets, find the one that's not the embedded wallet
    const smartWallet = privyWallets.find(
      wallet => wallet.address?.toLowerCase() !== embeddedWallet.address?.toLowerCase()
    )
    if (smartWallet) {
      console.log('✅ Smart wallet identified:', smartWallet.address)
      return smartWallet
    }
  }
  
  // If we have multiple wallets, find the one that doesn't match the embedded pattern
  if (privyWallets.length > 1) {
    const nonEmbedded = privyWallets.find(
      wallet => !wallet.address?.toLowerCase().startsWith('0x1f93')
    )
    if (nonEmbedded) {
      console.log('✅ Smart wallet identified (non-embedded pattern):', nonEmbedded.address)
      return nonEmbedded
    }
  }
  
  // If only one wallet and it's NOT the embedded pattern, it might be the smart wallet
  // (This can happen if smart wallet is created first or if detection is delayed)
  if (privyWallets.length === 1 && !privyWallets[0].address?.toLowerCase().startsWith('0x1f93')) {
    console.log('⚠️ Only one wallet found, not embedded pattern (might be smart wallet):', privyWallets[0].address)
    return privyWallets[0]
  }
  
  console.log('❌ Smart wallet not found. Only embedded wallet or no wallets detected.')
  return null
}
```

**What Works**:
- ✅ Embedded wallet identification (by `0x1F93` prefix)
- ✅ Wallet type detection
- ✅ Multiple wallet handling

**Issues**:
- ⚠️ Relies on heuristic (address prefix) rather than contract verification
- ⚠️ Doesn't distinguish between Privy smart wallets and ZeroDev smart wallets

### 2.3 Onboarding Flow

**Location**: `components/onboarding/steps/StepConnect.tsx`

```57:121:components/onboarding/steps/StepConnect.tsx
  // Get the embedded wallet (EOA) address - this is created on login
  // Smart wallet will be created later in StepBlockchain
  const embeddedWallet = identifyEmbeddedWallet(wallets)
  const embeddedWalletAddress = embeddedWallet?.address
  
  // Log wallet detection for debugging
  useEffect(() => {
    if (authenticated && ready && wallets.length > 0) {
      console.log('🔍 Wallet Detection Debug (StepConnect - EOA only):', {
        totalWallets: wallets.length,
        embeddedWalletAddress,
        allWallets: wallets.map(w => ({
          address: w.address,
          type: w.walletClientType,
          chainId: w.chainId
        }))
      })
    }
  }, [authenticated, ready, wallets, embeddedWalletAddress])

  // Update store when user data is available
  // Store EOA address - smart wallet will be created later in StepBlockchain
  useEffect(() => {
    if (authenticated && user && user.email?.address) {
      const userEmail = user.email?.address
      const celoChain = getCeloChain()
      
      if (!embeddedWalletAddress) {
        console.warn('⚠️ No embedded wallet found')
        return
      }
      
      console.log('📝 StepConnect - Storing EOA address:', {
        authenticated,
        userEmail,
        embeddedWalletAddress,
        currentDataEmail: data.email,
        currentDataWallet: data.walletAddress,
        celoChainId: celoChain.id,
        note: 'EOA stored - smart wallet will be created in StepBlockchain'
      })
      
      // Validate Celo address format
      const isValidAddress = isValidCeloAddress(embeddedWalletAddress)
      
      // Store the EOA address - smart wallet will be created later
      if (userEmail !== data.email || embeddedWalletAddress !== data.walletAddress) {
        updateData({ 
          email: userEmail,
          walletAddress: embeddedWalletAddress,
          privyId: user.id,
          celoChainId: celoChain.id,
          walletType: 'embedded' // Mark as embedded - smart wallet created later
        })
        console.log('✅ Updated store with EOA address:', { 
          email: userEmail, 
          walletAddress: embeddedWalletAddress,
          walletType: 'embedded',
          celoChainId: celoChain.id,
          isValidAddress,
          note: 'Smart wallet will be created in StepBlockchain'
        })
      }
    }
  }, [authenticated, user, embeddedWalletAddress, data.email, data.walletAddress, updateData, wallets])
```

**What Works**:
- ✅ Email authentication flow
- ✅ Embedded wallet creation and storage
- ✅ Onboarding state management

---

## 3. What Works with ZeroDev ✅

### 3.1 Smart Wallet Creation

**Location**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

```61:226:lib/contexts/ZeroDevSmartWalletProvider.tsx
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

      try {
        setIsInitializing(true)
        setError(null)
        console.log('[ZERODEV] Initializing smart wallet with wallets:', wallets.length)
        console.log('[ZERODEV] Using Celo Mainnet (Chain ID: 42220)')
        
        // Get EntryPoint v0.7 from ZeroDev SDK
        const entryPoint = getEntryPoint('0.7')
        
        // Look for either embedded wallet (email login) or connected wallet (MetaMask login)
        const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy')
        const connectedWallet = wallets.find((wallet) => wallet.walletClientType !== 'privy')
        
        const walletToUse = embeddedWallet || connectedWallet
        if (!walletToUse) {
          console.log('[ZERODEV] No wallet found for smart account creation')
          setIsInitializing(false)
          return
        }
        
        console.log('[ZERODEV] Found wallet:', {
          address: walletToUse.address,
          type: walletToUse.walletClientType,
          isEmbedded: !!embeddedWallet,
          isConnected: !!connectedWallet,
          chainId: walletToUse.chainId
        })
        
        // Log all available wallets for debugging
        console.log('[ZERODEV] All available wallets:', wallets.map(w => ({
          address: w.address,
          type: w.walletClientType,
          chainId: w.chainId
        })))
        
        // Get the EIP1193 provider from the selected wallet
        const provider = await walletToUse.getEthereumProvider()
        if (!provider) {
          throw new Error('Failed to get Ethereum provider from wallet')
        }

        console.log('[ZERODEV] Creating ECDSA Kernel smart account...')
        
        // Create public client for blockchain interactions
        const publicClient = createPublicClient({
          chain: FORCED_CHAIN,
          transport: http(),
        })
        
        console.log('[ZERODEV] Creating ECDSA validator...')
        
        // Create wallet client with account for signing
        // Using address with custom transport - the provider handles signing
        // Type assertion needed because viem's type system doesn't fully recognize
        // that custom transport with address string works as a WalletClient with Account
        const walletClient = createWalletClient({
          account: walletToUse.address as `0x${string}`,
          chain: FORCED_CHAIN,
          transport: custom(provider),
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
        
        console.log('[ZERODEV] Smart account created with index 0 (deterministic)')
        console.log('[ZERODEV] Owner (EOA):', walletToUse.address)
        console.log('[ZERODEV] Smart account address:', account.address)

        console.log('[ZERODEV] Created smart account:', account.address)

        // URLs with Chain ID 42220 (Celo Mainnet)
        const bundlerUrl = `https://rpc.zerodev.app/api/v3/${zeroDevProjectId}/chain/${FORCED_CHAIN.id}`
        
        // ZeroDev Paymaster Configuration (Self-Funded)
        // Using selfFunded=true since you've deposited CELO directly to the paymaster contract
        // Note: If this doesn't work, try without the parameter: 
        // const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}`
        const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}?selfFunded=true`
        
        console.log('[ZERODEV] Creating ZeroDev paymaster client...')
        console.log('[ZERODEV] Project ID:', zeroDevProjectId)
        console.log('[ZERODEV] Paymaster URL:', paymasterUrl.replace(zeroDevProjectId, '***'))
        console.log('[ZERODEV] Chain ID:', FORCED_CHAIN.id)
        
        // Create ZeroDev paymaster client
        const paymasterClient = createZeroDevPaymasterClient({
          chain: FORCED_CHAIN,
          transport: http(paymasterUrl),
        })
        
        console.log('[ZERODEV] ✅ ZeroDev paymaster client created (self-funded)')
        
        console.log('[ZERODEV] Creating Kernel account client...')
        
        // Create Kernel client using ZeroDev SDK with ZeroDev paymaster
        const client = createKernelAccountClient({
          account,
          chain: FORCED_CHAIN,
          bundlerTransport: http(bundlerUrl),
          paymaster: paymasterClient, // ZeroDev paymaster client (self-funded)
          client: publicClient,
        })
        
        console.log('[ZERODEV] ✅ ZeroDev paymaster configured - gasless transactions enabled')
        
        console.log("[ZERODEV] ✅ Smart account client created:", client.account.address)
        console.log("[ZERODEV] Chain ID:", await client.getChainId())

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
  }, [authenticated, wallets, zeroDevProjectId])
```

**What Works (Locally)**:
- ✅ Smart wallet creation using Kernel v3.1
- ✅ ECDSA validator setup
- ✅ Deterministic address generation (index 0)
- ✅ Paymaster configuration
- ✅ Gasless transaction support

**What Fails (On Vercel)**:
- ❌ Smart wallet initialization fails
- ❌ Environment variable issues
- ❌ Network/API connectivity issues

### 3.2 Smart Wallet Usage in UI

**Location**: `components/layout/Topbar.tsx`

```38:43:components/layout/Topbar.tsx
  // ZeroDev smart wallet hook
  const { smartAccountAddress, isInitializing } = useSmartAccount()
  
  // Get EOA (embedded wallet from Privy)
  const embeddedWallet = identifyEmbeddedWallet(wallets)
  const eoaAddress = embeddedWallet?.address
```

**What Works**:
- ✅ Smart wallet address display
- ✅ Loading state handling
- ✅ Fallback to EOA address

---

## 4. Critical Issues Identified 🔴

### 4.1 Environment Variable Fallback (CRITICAL)

**Location**: `components/PrivyProviderWrapper.tsx:13`

```13:13:components/PrivyProviderWrapper.tsx
  const zeroDevProjectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || 'e46f4ac3-404e-42fc-a3d3-1c75846538a8'
```

**Problem**:
- Hardcoded fallback project ID may not be configured correctly in ZeroDev dashboard
- In production, if env var is missing, it silently uses the fallback
- This could cause smart wallet creation to fail on Vercel

**Impact**: 🔴 **HIGH** - Likely cause of Vercel failures

### 4.2 Client-Side Only Initialization

**Location**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

**Problem**:
- ZeroDev initialization happens entirely client-side
- No SSR/hydration handling
- Could cause issues with Next.js build process
- Environment variables might not be available during build

**Impact**: 🟡 **MEDIUM** - Could cause hydration mismatches

### 4.3 No Error Recovery

**Location**: `lib/contexts/ZeroDevSmartWalletProvider.tsx:211-218`

```211:218:lib/contexts/ZeroDevSmartWalletProvider.tsx
      } catch (err) {
        console.error("[ZERODEV] ❌ Error initializing smart wallet:", err)
        console.error("[ZERODEV] Error details:", {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          name: err instanceof Error ? err.name : undefined,
        })
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
```

**Problem**:
- Errors are logged but not handled
- No retry mechanism
- No fallback to alternative wallet methods
- User experience degrades silently

**Impact**: 🟡 **MEDIUM** - Poor error handling

### 4.4 Network/API Configuration

**Location**: `lib/contexts/ZeroDevSmartWalletProvider.tsx:172-178`

```172:178:lib/contexts/ZeroDevSmartWalletProvider.tsx
        // URLs with Chain ID 42220 (Celo Mainnet)
        const bundlerUrl = `https://rpc.zerodev.app/api/v3/${zeroDevProjectId}/chain/${FORCED_CHAIN.id}`
        
        // ZeroDev Paymaster Configuration (Self-Funded)
        // Using selfFunded=true since you've deposited CELO directly to the paymaster contract
        // Note: If this doesn't work, try without the parameter: 
        // const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}`
        const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}?selfFunded=true`
```

**Problem**:
- Hardcoded URLs might not work in all environments
- `selfFunded=true` parameter might cause issues
- No timeout or retry logic for API calls
- CORS issues possible on Vercel

**Impact**: 🟡 **MEDIUM** - Could cause network failures

### 4.5 Wallet Type Confusion

**Problem**:
- Codebase mixes Privy smart wallets and ZeroDev smart wallets
- `wallet-utils.ts` identifies Privy smart wallets (by address prefix)
- But ZeroDev creates separate smart wallets
- No clear distinction between the two systems

**Impact**: 🟡 **MEDIUM** - Code complexity and potential bugs

---

## 5. Production vs Local Differences

### 5.1 Environment Variables

**Local (.env.local)**:
```bash
NEXT_PUBLIC_ZERODEV_PROJECT_ID=actual-project-id
NEXT_PUBLIC_PRIVY_APP_ID=actual-app-id
```

**Vercel (Environment Variables)**:
- Must be set in Vercel dashboard
- Must be set for correct environment (Production/Preview/Development)
- Must be prefixed with `NEXT_PUBLIC_` for client-side access

**Issue**: If not set correctly in Vercel, fallback is used, which may not work.

### 5.2 Build-Time vs Runtime

**Local**:
- Environment variables loaded from `.env.local`
- Available at runtime
- Hot reload picks up changes

**Vercel**:
- Environment variables injected at build time
- Must be set before deployment
- Changes require redeployment

### 5.3 Network Access

**Local**:
- Direct network access
- No CORS restrictions
- Can access ZeroDev APIs directly

**Vercel**:
- Serverless functions
- Potential CORS issues
- Network timeouts
- Rate limiting

---

## 6. What Needs to Change

### 6.1 Immediate Fixes (Critical)

#### Fix 1: Remove Hardcoded Fallback

**File**: `components/PrivyProviderWrapper.tsx`

**Current**:
```typescript
const zeroDevProjectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || 'e46f4ac3-404e-42fc-a3d3-1c75846538a8'
```

**Change to**:
```typescript
const zeroDevProjectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID

if (!zeroDevProjectId) {
  console.error('[ZERODEV] NEXT_PUBLIC_ZERODEV_PROJECT_ID is not set!')
  // Optionally throw error or show user-friendly message
}
```

**Why**: Prevents silent failures with wrong project ID.

#### Fix 2: Add Environment Variable Validation

**File**: `components/PrivyProviderWrapper.tsx`

**Add**:
```typescript
export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const zeroDevProjectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID

  // Validate required environment variables
  if (!privyAppId) {
    console.error('[PRIVY] NEXT_PUBLIC_PRIVY_APP_ID is not set!')
    return (
      <div className="p-4 text-red-500">
        Configuration Error: Privy App ID is missing. Please check your environment variables.
      </div>
    )
  }

  if (!zeroDevProjectId) {
    console.error('[ZERODEV] NEXT_PUBLIC_ZERODEV_PROJECT_ID is not set!')
    return (
      <div className="p-4 text-red-500">
        Configuration Error: ZeroDev Project ID is missing. Please check your environment variables.
      </div>
    )
  }

  return (
    // ... rest of component
  )
}
```

#### Fix 3: Add Error Boundary for ZeroDev

**File**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

**Add retry logic**:
```typescript
const [retryCount, setRetryCount] = useState(0)
const MAX_RETRIES = 3

useEffect(() => {
  const initializeSmartWallet = async () => {
    // ... existing code ...
    
    try {
      // ... existing initialization ...
    } catch (err) {
      console.error("[ZERODEV] ❌ Error initializing smart wallet:", err)
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`[ZERODEV] Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, 2000 * (retryCount + 1)) // Exponential backoff
        return
      }
      
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsInitializing(false)
    }
  }

  initializeSmartWallet()
}, [authenticated, wallets, zeroDevProjectId, retryCount])
```

#### Fix 4: Add Network Error Handling

**File**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

**Add timeout and error handling**:
```typescript
// Add timeout wrapper
const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })
  return Promise.race([promise, timeout])
}

// In initialization:
try {
  const account = await withTimeout(
    createKernelAccount(publicClient, { /* ... */ }),
    30000, // 30 second timeout
    'Smart wallet creation timed out'
  )
  // ... rest of code
} catch (err) {
  // Handle timeout specifically
  if (err instanceof Error && err.message.includes('timed out')) {
    setError('Network timeout. Please check your connection and try again.')
  } else {
    setError(err instanceof Error ? err.message : "Unknown error")
  }
}
```

### 6.2 Medium Priority Fixes

#### Fix 5: Add Debug Mode for Production

**File**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

**Add**:
```typescript
const isDevelopment = process.env.NODE_ENV === 'development'
const debugMode = process.env.NEXT_PUBLIC_DEBUG_WALLETS === 'true'

// Enhanced logging
if (debugMode || isDevelopment) {
  console.log('[ZERODEV] Debug mode enabled')
  console.log('[ZERODEV] Environment:', {
    nodeEnv: process.env.NODE_ENV,
    hasProjectId: !!zeroDevProjectId,
    projectIdPrefix: zeroDevProjectId?.substring(0, 8),
    authenticated,
    walletsCount: wallets?.length
  })
}
```

#### Fix 6: Improve Paymaster URL Configuration

**File**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

**Change**:
```typescript
// Make paymaster URL configurable
const paymasterMode = process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_MODE || 'selfFunded'
const paymasterUrl = paymasterMode === 'selfFunded'
  ? `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}?selfFunded=true`
  : `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}`
```

### 6.3 Long-term Improvements

#### Fix 7: Separate Privy and ZeroDev Smart Wallets

**Problem**: Codebase confuses Privy smart wallets with ZeroDev smart wallets.

**Solution**: 
- Remove Privy smart wallet detection (if not using Privy's smart wallets)
- Use only ZeroDev smart wallets
- Update `wallet-utils.ts` to only identify embedded wallets (EOA)

#### Fix 8: Add Health Check Endpoint

**File**: `app/api/health/wallet/route.ts` (new file)

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    privyAppId: !!process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    zeroDevProjectId: !!process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json({
    status: checks.privyAppId && checks.zeroDevProjectId ? 'healthy' : 'unhealthy',
    checks,
  })
}
```

#### Fix 9: Add User-Friendly Error Messages

**File**: `components/layout/Topbar.tsx`

**Update error display**:
```typescript
{error && (
  <div className="px-3 py-2 text-sm border-b border-white/10 border-red-500/30">
    <p className="text-xs text-red-500">
      ⚠️ Smart wallet error: {error}
      {error.includes('NEXT_PUBLIC') && (
        <span className="block mt-1 text-xs">
          Please check environment variables configuration.
        </span>
      )}
    </p>
  </div>
)}
```

---

## 7. Vercel-Specific Issues

### 7.1 Environment Variables Not Set

**Symptom**: Smart wallets work locally but fail on Vercel.

**Solution**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_ZERODEV_PROJECT_ID` for Production environment
3. Add `NEXT_PUBLIC_PRIVY_APP_ID` for Production environment
4. Redeploy after adding variables

### 7.2 Build-Time vs Runtime

**Issue**: Environment variables must be available at build time for Next.js.

**Solution**: Ensure variables are set before deployment, not added after.

### 7.3 CORS/Network Issues

**Issue**: ZeroDev API calls might be blocked.

**Solution**: 
- Check Vercel function logs
- Verify ZeroDev API allows requests from Vercel domains
- Consider using Vercel Edge Functions if needed

---

## 8. Testing Checklist

### Local Testing ✅
- [x] Smart wallet creation works
- [x] Embedded wallet detection works
- [x] ZeroDev initialization succeeds
- [x] Paymaster configuration works

### Production Testing ❌
- [ ] Environment variables are set in Vercel
- [ ] Smart wallet creation works on Vercel
- [ ] ZeroDev API calls succeed
- [ ] Error messages are user-friendly
- [ ] Fallback behavior works correctly

---

## 9. Recommended Action Plan

### Phase 1: Immediate (Critical)
1. ✅ Remove hardcoded fallback project ID
2. ✅ Add environment variable validation
3. ✅ Add error handling and retry logic
4. ✅ Verify Vercel environment variables are set

### Phase 2: Short-term (High Priority)
5. ✅ Add network timeout handling
6. ✅ Improve error messages
7. ✅ Add health check endpoint
8. ✅ Add debug logging for production

### Phase 3: Long-term (Medium Priority)
9. ✅ Separate Privy and ZeroDev wallet logic
10. ✅ Add comprehensive error recovery
11. ✅ Improve user experience for wallet errors
12. ✅ Add monitoring and alerting

---

## 10. Conclusion

**Current State**:
- ✅ Privy authentication and embedded wallets work correctly
- ✅ ZeroDev smart wallet creation works locally
- ❌ ZeroDev smart wallet creation fails on Vercel (likely due to environment variables)

**Root Cause**:
The hardcoded fallback project ID and missing environment variable validation are likely causing silent failures on Vercel. The code doesn't properly handle missing or incorrect configuration.

**Next Steps**:
1. Remove hardcoded fallback
2. Add proper environment variable validation
3. Verify Vercel environment variables
4. Add error handling and retry logic
5. Test on Vercel after fixes

---

*Analysis Date: $(date)*
*Codebase Version: smartwallets branch*
















