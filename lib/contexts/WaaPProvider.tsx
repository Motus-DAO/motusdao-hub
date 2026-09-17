'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Address } from 'viem'
import { getWalletConnectProjectId } from '@/lib/wallet/config'
import { isRecoverableWaapSdkError } from '@/lib/wallet/waap-errors'
import {
  dismissWaapWalletOverlay,
  isEmbeddedWaapLoginMethod,
} from '@/lib/wallet/waap-modal-recovery'

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
  /** Explicit email share — opens Human Tech once; do not call from auto-login. */
  requestSharedEmail: () => Promise<string | null>
  
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
  requestSharedEmail: async () => null,
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

  // Set up global error handlers for known WaaP SDK errors
  // The SDK sometimes throws UTF-8 encoding errors when processing hashes internally
  // This is a known issue in the @reown/appkit-adapter-ethers dependency that uses ethers v5
  // The error occurs when the SDK tries to decode a hash as UTF-8 text
  useEffect(() => {
    // Store original console methods
    const originalError = console.error.bind(console)

    // Override console.error to catch WaaP SDK errors
    const patchedError = function(...args: unknown[]) {
      // Check each argument for the known error pattern
      for (const arg of args) {
        if (isRecoverableWaapSdkError(arg)) {
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
      
      if (isRecoverableWaapSdkError(combinedStr)) {
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
      if (isRecoverableWaapSdkError(event.error) || isRecoverableWaapSdkError(event.message)) {
        console.debug('[WAAP] Suppressed unhandled SDK error (non-fatal)')
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      return true
    }

    // Handle unhandled promise rejections from WaaP SDK
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isRecoverableWaapSdkError(event.reason)) {
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

  // Initialize WaaP SDK (v2 returns the EIP-1193 facade directly)
  // Reference: https://docs.waap.human.tech/for-apps/start
  useEffect(() => {
    let cancelled = false
    let providerInstance: { destroy?: () => void; preload?: () => Promise<void> } | null =
      null
    let cancelPreload: (() => void) | undefined

    const initializeWaaP = async () => {
      console.log('[WAAP] Initializing WaaP SDK...')
      console.log('[WAAP] Docs: https://docs.waap.human.tech/for-apps/start')

      try {
        const waapSdk = await import('@human.tech/waap-sdk').catch(() => null)

        if (!waapSdk) {
          console.warn('[WAAP] WaaP SDK not found (@human.tech/waap-sdk)')
          if (!cancelled) {
            setReady(true)
            setIsWaaPReady(false)
          }
          return
        }

        const walletConnectProjectId = getWalletConnectProjectId()
        const authenticationMethods: Array<'email' | 'phone' | 'social' | 'wallet'> =
          walletConnectProjectId
            ? ['email', 'phone', 'social', 'wallet']
            : ['email', 'phone', 'social']

        if (!walletConnectProjectId) {
          console.warn(
            '[WAAP] WalletConnect project ID is not set. External wallet login is disabled. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID or NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID.'
          )
        }

        const origin =
          typeof window !== 'undefined' ? window.location.origin : undefined

        // v2+: initWaaP returns the provider; also assigns window.waap.
        // Absolute logo avoids blank branding inside the cross-origin iframe.
        const provider = waapSdk.initWaaP({
          environment: 'production',
          config: {
            authenticationMethods,
            allowedSocials: ['google', 'twitter'],
            styles: {
              darkMode: true,
            },
          },
          project: {
            name: 'MotusDAO',
            ...(origin ? { logo: `${origin}/logo.svg` } : {}),
            entryTitle: 'Welcome to MotusDAO',
          },
          walletConnectProjectId,
        })

        if (cancelled) {
          provider.destroy?.()
          return
        }

        providerInstance = provider
        setWaaPProvider(provider)
        setIsWaaPReady(true)
        setReady(true)
        console.log('[WAAP] ✅ WaaP EIP-1193 provider ready')

        // Warm iframe after LCP so the first sign/login is less likely to hit about:blank.
        if (typeof waapSdk.preloadWaaPOnIdle === 'function') {
          cancelPreload = waapSdk.preloadWaaPOnIdle(provider, {
            onError: (error: unknown) => {
              console.debug('[WAAP] Idle preload skipped:', error)
            },
          })
        } else {
          void provider.preload?.().catch(() => {})
        }

        void checkExistingSession(provider)
      } catch (error) {
        console.error('[WAAP] ❌ Error initializing WaaP:', error)
        if (!cancelled) setReady(true)
      }
    }

    void initializeWaaP()

    return () => {
      cancelled = true
      cancelPreload?.()
      try {
        providerInstance?.destroy?.()
      } catch (error) {
        console.debug('[WAAP] destroy on unmount:', error)
      }
    }
  }, [])

  // Check for existing authenticated session (auto-connect).
  // Stay silent: eth_requestAccounts + immediate chain switch open Human Tech's
  // iframe shell and often leave a blank/black overlay when restoring a session.
  const checkExistingSession = async (provider: unknown) => {
    try {
      const waap = provider as {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
        getLoginMethod: () => 'waap' | 'human' | 'injected' | 'walletconnect' | null
      }

      const loginMethod = waap.getLoginMethod?.()
      console.log('[WAAP] Checking existing session, login method:', loginMethod)

      if (!loginMethod) {
        console.log('[WAAP] No previous session found')
        return
      }

      const AUTO_CONNECT_MS = 8_000
      const withTimeout = async <T,>(promise: Promise<T>, label: string) =>
        Promise.race([
          promise,
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error(`WaaP auto-connect timed out (${label})`)),
              AUTO_CONNECT_MS
            )
          }),
        ])

      const accounts = (await withTimeout(
        waap.request({ method: 'eth_accounts' }) as Promise<string[]>,
        'eth_accounts'
      )) as string[]

      // Never escalate to eth_requestAccounts on restore — that mounts the
      // #waap-wallet-iframe-container shell (often black / about:blank).
      // Fall back to the last known address so the Hub can still render.
      let address = accounts?.[0] as Address | undefined
      if (!address) {
        try {
          const storedUser = localStorage.getItem('waap_user')
          if (storedUser) {
            const parsed = JSON.parse(storedUser) as WaaPUser
            address = parsed.wallet?.address as Address | undefined
          }
        } catch {
          // ignore
        }
      }

      if (!address) {
        console.log('[WAAP] Session cookie present but no silent accounts; waiting for explicit login')
        return
      }

      console.log('[WAAP] ✅ Auto-connected with address:', address)

      const walletType = isEmbeddedWaapLoginMethod(loginMethod) ? 'waap' : 'external'

      setAuthenticated(true)
      setWallets([
        {
          address,
          walletClientType: walletType,
          chainId: CELO_CHAIN_ID.toString(),
          connected: true,
        },
      ])

      const storedUser = localStorage.getItem('waap_user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      } else {
        setUser({
          id: `waap_${address.slice(2, 10)}`,
          wallet: { address },
        })
      }

      // Do not call wallet_switchEthereumChain on silent restore — it opens the
      // Human Tech iframe and frequently leaves a blank/black shell with no close
      // control. Chain alignment happens on explicit sign / tx when needed.
      console.log('[WAAP] Skipping chain switch on silent session restore')
    } catch (error) {
      console.log('[WAAP] Auto-connect not available or failed:', error)
      dismissWaapWalletOverlay()
      // Do NOT logout on timeout/recoverable errors — that thrash-disconnects
      // users mid-session. Only clear local cache for clearly stale Silk sessions.
      if (isRecoverableWaapSdkError(error)) {
        localStorage.removeItem('waap_user')
      }
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
        login: () => Promise<'waap' | 'human' | 'injected' | 'walletconnect' | null>
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      }

      // Open WaaP login modal - returns the login type chosen
      // v2 may return 'human' (legacy alias) or 'waap' for embedded wallet.
      const loginType = await waap.login()
      console.log('[WAAP] Login type selected:', loginType)

      if (loginType === null) {
        console.log('[WAAP] User cancelled login')
        return
      }

      // Prefer silent accounts — eth_requestAccounts right after login can re-open UI / CAPTCHA.
      let accounts = (await waap.request({ method: 'eth_accounts' })) as string[]
      if (!accounts?.length) {
        accounts = (await waap.request({ method: 'eth_requestAccounts' })) as string[]
      }

      if (accounts && accounts.length > 0) {
        const address = accounts[0] as Address
        console.log('[WAAP] ✅ Connected with address:', address)

        const walletType = isEmbeddedWaapLoginMethod(loginType) ? 'waap' : 'external'

        // Mark connected immediately so Topbar / onboarding sync before any email modal.
        // Do NOT call requestEmail here — that opens a 2nd Human Tech modal + slide CAPTCHA.
        const storedUser = localStorage.getItem('waap_user')
        let restoredEmail: string | undefined
        try {
          if (storedUser) {
            const parsed = JSON.parse(storedUser) as WaaPUser
            restoredEmail = parsed.email?.address
          }
        } catch {
          // ignore
        }

        const waapUser: WaaPUser = {
          id: `waap_${address.slice(2, 10)}`,
          email: restoredEmail ? { address: restoredEmail } : undefined,
          wallet: { address },
        }

        setAuthenticated(true)
        setWallets([
          {
            address,
            walletClientType: walletType,
            chainId: CELO_CHAIN_ID.toString(),
            connected: true,
          },
        ])
        setUser(waapUser)
        localStorage.setItem('waap_user', JSON.stringify(waapUser))

        // Defer chain switch — sequential wallet RPCs after login trigger Human Tech
        // "Slide to confirm" even when the user opted out for this site.
        window.setTimeout(() => {
          void waap
            .request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: CELO_CHAIN_ID_HEX }],
            })
            .then(() => console.log('[WAAP] ✅ Switched to Celo Mainnet'))
            .catch((switchError) =>
              console.log('[WAAP] Could not switch to Celo:', switchError)
            )
        }, 2_500)

        console.log('[WAAP] ✅ Login complete:', waapUser)
      }
    } catch (error) {
      console.error('[WAAP] ❌ Login error:', error)
      if (isRecoverableWaapSdkError(error)) {
        return
      }
      throw error
    }
  }, [waapProvider, isWaaPReady])

  const requestSharedEmail = useCallback(async (): Promise<string | null> => {
    if (!waapProvider) return null
    const waap = waapProvider as {
      requestEmail?: () => Promise<string>
      getLoginMethod?: () => 'waap' | 'human' | 'injected' | 'walletconnect' | null
    }
    const method = waap.getLoginMethod?.()
    if (!isEmbeddedWaapLoginMethod(method)) {
      return user?.email?.address ?? null
    }
    try {
      const email = await waap.requestEmail?.()
      if (!email) return null
      setUser((prev) => {
        const next: WaaPUser = prev
          ? { ...prev, email: { address: email } }
          : { id: `waap_${Date.now()}`, email: { address: email } }
        localStorage.setItem('waap_user', JSON.stringify(next))
        return next
      })
      return email
    } catch (error) {
      console.log('[WAAP] requestEmail declined or failed:', error)
      return null
    }
  }, [waapProvider, user?.email?.address])

  // Logout handler
  // Reference: https://docs.wallet.human.tech/docs/guides/methods#logout
  const logout = useCallback(async () => {
    console.log('[WAAP] Logging out...')
    
    try {
      if (waapProvider) {
        const waap = waapProvider as {
          logout: () => Promise<void>
          getLoginMethod: () => 'waap' | 'human' | 'injected' | 'walletconnect' | null
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

  // Legacy Privy-shaped email helpers — WaaP owns email OTP inside its modal.
  const sendCode = useCallback(
    async (_params: { email: string }) => {
      console.log('[WAAP] Opening Human Tech modal instead of legacy email OTP')
      await login()
    },
    [login]
  )

  const loginWithCode = useCallback(
    async (_params: { code: string }) => {
      console.log('[WAAP] loginWithCode redirected to Human Tech modal')
      await login()
    },
    [login]
  )

  // Listen for WaaP events
  // Reference: https://docs.wallet.human.tech/docs/guides/methods#event-listeners
  useEffect(() => {
    if (!waapProvider) return

    const waap = waapProvider as {
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
      getLoginMethod: () => 'waap' | 'human' | 'injected' | 'walletconnect' | null
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }

    let emptyAccountsTimer: ReturnType<typeof setTimeout> | null = null

    const clearLocalAuth = () => {
      setAuthenticated(false)
      setUser(null)
      setWallets([])
    }

    // Account changes - handle wallet switching or disconnection
    const handleAccountsChanged = (accounts: unknown) => {
      const accountsArray = accounts as string[]
      console.log('[WAAP] accountsChanged event:', accountsArray)

      if (emptyAccountsTimer) {
        clearTimeout(emptyAccountsTimer)
        emptyAccountsTimer = null
      }

      if (accountsArray.length === 0) {
        // Silk often emits [] transiently during personal_sign — confirm before wipe.
        emptyAccountsTimer = setTimeout(() => {
          void (async () => {
            try {
              const still = (await waap.request({ method: 'eth_accounts' })) as string[]
              if (still?.length) {
                console.log('[WAAP] Ignoring transient empty accountsChanged')
                const loginMethod = waap.getLoginMethod?.()
                const walletType = isEmbeddedWaapLoginMethod(loginMethod) ? 'waap' : 'external'
                setAuthenticated(true)
                setWallets([
                  {
                    address: still[0] as Address,
                    walletClientType: walletType,
                    chainId: CELO_CHAIN_ID.toString(),
                    connected: true,
                  },
                ])
                return
              }
            } catch {
              // fall through to disconnect
            }
            console.log('[WAAP] Wallet disconnected (confirmed)')
            clearLocalAuth()
          })()
        }, 1_500)
        return
      }

      const loginMethod = waap.getLoginMethod?.()
      const walletType = isEmbeddedWaapLoginMethod(loginMethod) ? 'waap' : 'external'

      setAuthenticated(true)
      setWallets([
        {
          address: accountsArray[0] as Address,
          walletClientType: walletType,
          chainId: CELO_CHAIN_ID.toString(),
          connected: true,
        },
      ])

      setUser((prev) =>
        prev
          ? {
              ...prev,
              wallet: { address: accountsArray[0] },
            }
          : null
      )
    }

    const handleChainChanged = (chainId: unknown) => {
      console.log('[WAAP] chainChanged event:', chainId)
    }

    const handleConnect = () => {
      console.log('[WAAP] connect event')
    }

    const handleDisconnect = (error: unknown) => {
      console.log('[WAAP] disconnect event:', error)
      // Debounce — same transient empty-account race as accountsChanged.
      if (emptyAccountsTimer) clearTimeout(emptyAccountsTimer)
      emptyAccountsTimer = setTimeout(() => {
        void (async () => {
          try {
            const still = (await waap.request({ method: 'eth_accounts' })) as string[]
            if (still?.length) {
              console.log('[WAAP] Ignoring transient disconnect')
              return
            }
          } catch {
            // fall through
          }
          clearLocalAuth()
        })()
      }, 1_500)
    }

    waap.on('accountsChanged', handleAccountsChanged)
    waap.on('chainChanged', handleChainChanged)
    waap.on('connect', handleConnect)
    waap.on('disconnect', handleDisconnect)

    return () => {
      if (emptyAccountsTimer) clearTimeout(emptyAccountsTimer)
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
        requestSharedEmail,
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
