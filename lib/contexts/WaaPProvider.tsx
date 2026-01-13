'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Address } from 'viem'

// ============================================================================
// TYPES - Compatible with Privy patterns for easier migration
// ============================================================================

interface WaaPUser {
  id: string // WaaP user identifier
  email?: {
    address: string
  }
  phone?: {
    number: string
  }
  google?: {
    email: string
  }
  wallet?: {
    address: string
  }
}

interface WaaPWallet {
  address: Address
  walletClientType: 'waap' | 'external'
  chainId: string
  connected: boolean
}

interface WaaPContextType {
  // Auth state (mirrors usePrivy)
  ready: boolean
  authenticated: boolean
  user: WaaPUser | null
  
  // Auth methods
  login: () => Promise<void>
  logout: () => Promise<void>
  
  // Email login (mirrors Privy's useLoginWithEmail)
  sendCode: (params: { email: string }) => Promise<void>
  loginWithCode: (params: { code: string }) => Promise<void>
  
  // Wallet state
  wallets: WaaPWallet[]
  
  // WaaP-specific
  waapProvider: unknown | null
  isWaaPReady: boolean
}

const WaaPContext = createContext<WaaPContextType>({
  ready: false,
  authenticated: false,
  user: null,
  login: async () => {},
  logout: async () => {},
  sendCode: async () => {},
  loginWithCode: async () => {},
  wallets: [],
  waapProvider: null,
  isWaaPReady: false,
})

// ============================================================================
// WAAP INITIALIZATION CONFIG
// Based on: https://docs.wallet.human.tech/quick-start
// 
// NO APP ID REQUIRED - WaaP uses a simple config-based initialization
// SDK types imported from @human.tech/waap-sdk
// ============================================================================

// Using SDK types directly - InitWaaPOptions is the correct type for initWaaP()
// SocialProvider: 'discord' | 'github' | 'google' | 'twitter' | 'bluesky'
// AuthenticationMethod: 'email' | 'phone' | 'social' | 'biometrics' | 'wallet'

// Celo Mainnet chain ID for switching
const CELO_CHAIN_ID = 42220
const CELO_CHAIN_ID_HEX = '0xa4ec' // 42220 in hex

// ============================================================================
// WAAP PROVIDER COMPONENT
// ============================================================================

interface WaaPProviderProps {
  children: ReactNode
}

export function WaaPProvider({ children }: WaaPProviderProps) {
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState<WaaPUser | null>(null)
  const [wallets, setWallets] = useState<WaaPWallet[]>([])
  const [waapProvider, setWaaPProvider] = useState<unknown | null>(null)
  const [isWaaPReady, setIsWaaPReady] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  // Set up global error handlers for known WaaP SDK errors
  // The SDK sometimes throws UTF-8 encoding errors when processing hashes internally
  // This is a known issue in the @reown/appkit-adapter-ethers dependency that uses ethers v5
  // The error occurs when the SDK tries to decode a hash as UTF-8 text
  useEffect(() => {
    // Check if this error should be suppressed
    const isKnownWaaPError = (input: unknown): boolean => {
      if (!input) return false
      
      // Handle various input types
      let str = ''
      if (input instanceof Error) {
        str = `${input.message || ''} ${input.name || ''} ${input.stack || ''}`
      } else if (typeof input === 'object') {
        try {
          str = JSON.stringify(input)
        } catch {
          str = String(input)
        }
      } else {
        str = String(input)
      }
      
      return str.includes('invalid codepoint') || 
             str.includes('missing continuation byte') ||
             str.includes('unexpected continuation byte') ||
             str.includes('strings/5.7.0') ||
             str.includes('INVALID_ARGUMENT')
    }

    // Store original console methods
    const originalError = console.error.bind(console)

    // Override console.error to catch WaaP SDK errors
    const patchedError = function(...args: unknown[]) {
      // Check each argument for the known error pattern
      for (const arg of args) {
        if (isKnownWaaPError(arg)) {
          // Completely suppress this non-fatal SDK issue - don't even log it
          return
        }
      }
      
      // Also check the combined string
      const combinedStr = args.map(a => {
        if (a instanceof Error) return a.message || ''
        if (typeof a === 'object') {
          try { return JSON.stringify(a) } catch { return '' }
        }
        return String(a || '')
      }).join(' ')
      
      if (isKnownWaaPError(combinedStr)) {
        // Completely suppress this non-fatal SDK issue
        return
      }
      
      originalError.apply(console, args)
    }

    Object.defineProperty(console, 'error', {
      value: patchedError,
      writable: true,
      configurable: true
    })

    // Handle unhandled errors from WaaP SDK
    const handleError = (event: ErrorEvent) => {
      if (isKnownWaaPError(event.error) || isKnownWaaPError(event.message)) {
        console.debug('[WAAP] Suppressed unhandled SDK encoding error (non-fatal)')
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      return true
    }

    // Handle unhandled promise rejections from WaaP SDK
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isKnownWaaPError(event.reason)) {
        console.debug('[WAAP] Suppressed unhandled SDK promise rejection (non-fatal)')
        event.preventDefault()
        return false
      }
      return true
    }

    window.addEventListener('error', handleError, true) // Use capture phase
    window.addEventListener('unhandledrejection', handleRejection, true)
    
    return () => {
      Object.defineProperty(console, 'error', {
        value: originalError,
        writable: true,
        configurable: true
      })
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleRejection, true)
    }
  }, [])

  // Initialize WaaP SDK
  // Reference: https://docs.wallet.human.tech/quick-start
  useEffect(() => {
    const initializeWaaP = async () => {
      console.log('[WAAP] Initializing WaaP SDK...')
      console.log('[WAAP] Docs: https://docs.wallet.human.tech/quick-start')
      
      try {
        // Dynamic import of WaaP SDK - NO APP ID NEEDED
        const waapSdk = await import('@human.tech/waap-sdk').catch(() => null)
        
        if (!waapSdk) {
          console.warn('[WAAP] WaaP SDK not found (@human.tech/waap-sdk)')
          console.log('[WAAP] Install with: npm install @human.tech/waap-sdk')
          console.log('[WAAP] Using mock provider for development')
          setReady(true)
          setIsWaaPReady(false)
          return
        }

        // WaaP configuration - NO APP ID REQUIRED
        // See: https://docs.wallet.human.tech/docs/guides/methods#initwaap
        // SDK types: SocialProvider = 'discord' | 'github' | 'google' | 'twitter' | 'bluesky'
        // SDK types: AuthenticationMethod = 'email' | 'phone' | 'social' | 'biometrics' | 'wallet'
        
        // Get WalletConnect Project ID from environment (required for 'wallet' auth method)
        const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
        
        // Initialize WaaP - this sets up window.waap
        waapSdk.initWaaP({
          config: {
            // Authentication methods: email, phone, social login, and external wallets
            authenticationMethods: ['email', 'phone', 'social', 'wallet'],
            // Social login options
            allowedSocials: ['google', 'twitter'],
            // Dark mode to match MotusDAO theme
            styles: {
              darkMode: true,
            },
          },
          // Project branding
          project: {
            name: 'MotusDAO',
            logo: '/logo.svg',
            entryTitle: 'Welcome to MotusDAO',
          },
          // Required for external wallet support (MetaMask, etc.)
          walletConnectProjectId: walletConnectProjectId || undefined,
        })
        console.log('[WAAP] ✅ WaaP SDK initialized')

        // Wait a bit for window.waap to be set up
        await new Promise(resolve => setTimeout(resolve, 100))

        // Check if window.waap is available (EIP-1193 provider)
        if (typeof window !== 'undefined' && (window as unknown as { waap?: unknown }).waap) {
          const provider = (window as unknown as { waap: unknown }).waap
          setWaaPProvider(provider)
          setIsWaaPReady(true)
          console.log('[WAAP] ✅ WaaP EIP-1193 provider available (window.waap)')

          // Check for existing session (auto-connect)
          await checkExistingSession(provider)
        } else {
          console.warn('[WAAP] window.waap not available after initialization')
        }

        setReady(true)
      } catch (error) {
        console.error('[WAAP] ❌ Error initializing WaaP:', error)
        setReady(true) // Still mark as ready so UI doesn't hang
      }
    }

    initializeWaaP()
  }, [])

  // Check for existing authenticated session (auto-connect)
  // Reference: https://docs.wallet.human.tech/docs/guides/methods#auto-connect-functionality
  const checkExistingSession = async (provider: unknown) => {
    try {
      const waap = provider as {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
        getLoginMethod: () => 'waap' | 'injected' | 'walletconnect' | null
      }

      // Check if user was previously logged in
      const loginMethod = waap.getLoginMethod?.()
      console.log('[WAAP] Checking existing session, login method:', loginMethod)

      if (loginMethod) {
        // Auto-connect: eth_requestAccounts will reconnect using previous method
        const accounts = await waap.request({ method: 'eth_requestAccounts' }) as string[]
        
        if (accounts && accounts.length > 0) {
          console.log('[WAAP] ✅ Auto-connected with address:', accounts[0])
          
          // Determine wallet type based on login method
          const walletType = loginMethod === 'waap' ? 'waap' : 'external'
          
          setAuthenticated(true)
          setWallets([{
            address: accounts[0] as Address,
            walletClientType: walletType,
            chainId: CELO_CHAIN_ID.toString(),
            connected: true,
          }])
          
          // Restore user info
          const storedUser = localStorage.getItem('waap_user')
          if (storedUser) {
            setUser(JSON.parse(storedUser))
          } else {
            setUser({
              id: `waap_${accounts[0].slice(2, 10)}`,
              wallet: { address: accounts[0] },
            })
          }

          // Try to switch to Celo mainnet
          try {
            await waap.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: CELO_CHAIN_ID_HEX }],
            })
            console.log('[WAAP] ✅ Switched to Celo Mainnet')
          } catch (switchError) {
            console.log('[WAAP] Could not switch to Celo (may need to add network):', switchError)
          }
        }
      } else {
        console.log('[WAAP] No previous session found')
      }
    } catch (error) {
      console.log('[WAAP] Auto-connect not available or failed:', error)
    }
  }

  // Login handler - opens WaaP authentication modal
  // Reference: https://docs.wallet.human.tech/docs/guides/methods#login
  const login = useCallback(async () => {
    console.log('[WAAP] Opening login modal...')
    
    if (!isWaaPReady || !waapProvider) {
      console.warn('[WAAP] WaaP not ready, cannot login')
      
      // For development without SDK, simulate login
      if (process.env.NODE_ENV === 'development') {
        console.log('[WAAP] DEV MODE: Simulating login flow')
        const mockAddress = '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0') as Address
        setAuthenticated(true)
        setUser({
          id: `waap_dev_${Date.now()}`,
          email: { address: 'dev@motusdao.com' },
          wallet: { address: mockAddress },
        })
        setWallets([{
          address: mockAddress,
          walletClientType: 'waap',
          chainId: CELO_CHAIN_ID.toString(),
          connected: true,
        }])
        return
      }
      
      throw new Error('WaaP not initialized. Install @human.tech/waap-sdk')
    }

    try {
      const waap = waapProvider as {
        login: () => Promise<'waap' | 'injected' | 'walletconnect' | null>
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
        requestEmail: () => Promise<string>
      }

      // Open WaaP login modal - returns the login type chosen
      const loginType = await waap.login()
      console.log('[WAAP] Login type selected:', loginType)
      
      if (loginType === null) {
        console.log('[WAAP] User cancelled login')
        return
      }

      // Get the user's wallet address
      const accounts = await waap.request({ method: 'eth_requestAccounts' }) as string[]
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0] as Address
        console.log('[WAAP] ✅ Connected with address:', address)
        
        // Determine wallet type
        const walletType = loginType === 'waap' ? 'waap' : 'external'
        
        setAuthenticated(true)
        setWallets([{
          address,
          walletClientType: walletType,
          chainId: CELO_CHAIN_ID.toString(),
          connected: true,
        }])
        
        // Try to get user email (WaaP only)
        let userEmail: string | undefined
        if (loginType === 'waap') {
          try {
            userEmail = await waap.requestEmail()
            console.log('[WAAP] User email:', userEmail)
          } catch {
            console.log('[WAAP] User declined to share email or not available')
          }
        }
        
        const waapUser: WaaPUser = {
          id: `waap_${address.slice(2, 10)}`,
          email: userEmail ? { address: userEmail } : undefined,
          wallet: { address },
        }
        
        setUser(waapUser)
        localStorage.setItem('waap_user', JSON.stringify(waapUser))
        
        // Try to switch to Celo mainnet
        try {
          await waap.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CELO_CHAIN_ID_HEX }],
          })
          console.log('[WAAP] ✅ Switched to Celo Mainnet')
        } catch (switchError) {
          console.log('[WAAP] Could not switch to Celo:', switchError)
          // May need to add the network first
        }
        
        console.log('[WAAP] ✅ Login complete:', waapUser)
      }
    } catch (error) {
      console.error('[WAAP] ❌ Login error:', error)
      throw error
    }
  }, [waapProvider, isWaaPReady])

  // Logout handler
  // Reference: https://docs.wallet.human.tech/docs/guides/methods#logout
  const logout = useCallback(async () => {
    console.log('[WAAP] Logging out...')
    
    try {
      if (waapProvider) {
        const waap = waapProvider as {
          logout: () => Promise<void>
          getLoginMethod: () => 'waap' | 'injected' | 'walletconnect' | null
        }

        // Check current login method for proper logout handling
        const loginMethod = waap.getLoginMethod?.()
        console.log('[WAAP] Current login method:', loginMethod)

        if (loginMethod === 'injected') {
          // Injected wallets (MetaMask, etc.) can't be disconnected programmatically
          console.log('[WAAP] Injected wallet - clearing app session only')
          console.log('[WAAP] User needs to disconnect manually from wallet extension')
        }

        // Call logout - clears WaaP/WalletConnect sessions
        await waap.logout()
        console.log('[WAAP] ✅ WaaP logout called')
      }
    } catch (error) {
      console.log('[WAAP] Error during logout (continuing anyway):', error)
    }
    
    // Clear local state
    setAuthenticated(false)
    setUser(null)
    setWallets([])
    localStorage.removeItem('waap_user')
    
    console.log('[WAAP] ✅ Logged out and state cleared')
  }, [waapProvider])

  // Send OTP code via email (backwards compatibility with Privy's useLoginWithEmail)
  // Note: WaaP handles email auth through the login() modal directly
  // This method stores the email for use in loginWithCode
  const sendCode = useCallback(async ({ email }: { email: string }) => {
    console.log('[WAAP] Storing email for login:', email)
    
    // WaaP doesn't have a separate "send code" step - it's all in the login modal
    // We store the email for reference and proceed to login
    setPendingEmail(email)
    
    // For development without SDK
    if (!isWaaPReady && process.env.NODE_ENV === 'development') {
      console.log('[WAAP] DEV MODE: Email stored for mock login')
      return
    }
    
    console.log('[WAAP] ℹ️ WaaP uses a unified login modal for authentication')
    console.log('[WAAP] ℹ️ Call login() to open the WaaP authentication modal')
  }, [isWaaPReady])

  // Login with OTP code (backwards compatibility with Privy's useLoginWithEmail)
  // Note: WaaP handles this through the login() modal
  // This method triggers the login flow for backwards compatibility
  const loginWithCode = useCallback(async ({ code }: { code: string }) => {
    console.log('[WAAP] loginWithCode called')
    
    // For development without SDK
    if (!isWaaPReady) {
      if (process.env.NODE_ENV === 'development' && code === '123456') {
        console.log('[WAAP] DEV MODE: Mock login with code')
        const mockAddress = '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0') as Address
        
        setAuthenticated(true)
        setUser({
          id: `waap_${Date.now()}`,
          email: pendingEmail ? { address: pendingEmail } : undefined,
          wallet: { address: mockAddress },
        })
        setWallets([{
          address: mockAddress,
          walletClientType: 'waap',
          chainId: CELO_CHAIN_ID.toString(),
          connected: true,
        }])
        setPendingEmail(null)
        return
      }
      throw new Error('WaaP not initialized. Install @human.tech/waap-sdk')
    }

    // WaaP handles OTP internally through its modal
    // Trigger the standard login flow
    console.log('[WAAP] ℹ️ WaaP handles OTP verification internally')
    console.log('[WAAP] ℹ️ Opening WaaP login modal...')
    await login()
    setPendingEmail(null)
  }, [isWaaPReady, pendingEmail, login])

  // Listen for WaaP events
  // Reference: https://docs.wallet.human.tech/docs/guides/methods#event-listeners
  useEffect(() => {
    if (!waapProvider) return

    const waap = waapProvider as {
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
      getLoginMethod: () => 'waap' | 'injected' | 'walletconnect' | null
    }

    // Account changes - handle wallet switching or disconnection
    const handleAccountsChanged = (accounts: unknown) => {
      const accountsArray = accounts as string[]
      console.log('[WAAP] accountsChanged event:', accountsArray)
      
      if (accountsArray.length === 0) {
        // Wallet disconnected
        console.log('[WAAP] Wallet disconnected')
        setAuthenticated(false)
        setUser(null)
        setWallets([])
      } else {
        // Account switched - update state
        const loginMethod = waap.getLoginMethod?.()
        const walletType = loginMethod === 'waap' ? 'waap' : 'external'
        
        setWallets([{
          address: accountsArray[0] as Address,
          walletClientType: walletType,
          chainId: CELO_CHAIN_ID.toString(),
          connected: true,
        }])
        
        // Update user
        setUser(prev => prev ? {
          ...prev,
          wallet: { address: accountsArray[0] },
        } : null)
      }
    }

    // Chain changes - log and handle if needed
    const handleChainChanged = (chainId: unknown) => {
      console.log('[WAAP] chainChanged event:', chainId)
      // Could trigger reconnection or show warning if not on Celo
    }

    // Connect event
    const handleConnect = () => {
      console.log('[WAAP] connect event')
    }

    // Disconnect event
    const handleDisconnect = (error: unknown) => {
      console.log('[WAAP] disconnect event:', error)
      setAuthenticated(false)
      setUser(null)
      setWallets([])
    }

    // Subscribe to EIP-1193 events
    waap.on('accountsChanged', handleAccountsChanged)
    waap.on('chainChanged', handleChainChanged)
    waap.on('connect', handleConnect)
    waap.on('disconnect', handleDisconnect)

    // Cleanup on unmount
    return () => {
      waap.removeListener('accountsChanged', handleAccountsChanged)
      waap.removeListener('chainChanged', handleChainChanged)
      waap.removeListener('connect', handleConnect)
      waap.removeListener('disconnect', handleDisconnect)
    }
  }, [waapProvider])

  return (
    <WaaPContext.Provider
      value={{
        ready,
        authenticated,
        user,
        login,
        logout,
        sendCode,
        loginWithCode,
        wallets,
        waapProvider,
        isWaaPReady,
      }}
    >
      {children}
    </WaaPContext.Provider>
  )
}

// ============================================================================
// HOOKS - API-compatible with Privy hooks
// ============================================================================

/**
 * Main WaaP hook - compatible with usePrivy() API
 */
export function useWaaP() {
  const context = useContext(WaaPContext)
  if (!context) {
    throw new Error('useWaaP must be used within a WaaPProvider')
  }
  return context
}

/**
 * Alias for backward compatibility with code using usePrivy
 */
export const usePrivy = useWaaP

/**
 * Wallets hook - compatible with useWallets() API
 */
export function useWaaPWallets() {
  const { wallets } = useContext(WaaPContext)
  return { wallets }
}

/**
 * Alias for backward compatibility with code using useWallets
 */
export const useWallets = useWaaPWallets

/**
 * Email login hook - compatible with useLoginWithEmail() API
 */
export function useLoginWithEmail() {
  const { sendCode, loginWithCode } = useContext(WaaPContext)
  return { sendCode, loginWithCode }
}

/**
 * Get the raw EIP-1193 provider for use with viem/ethers
 */
export function useWaaPProvider() {
  const { waapProvider, isWaaPReady } = useContext(WaaPContext)
  return { provider: waapProvider, isReady: isWaaPReady }
}
