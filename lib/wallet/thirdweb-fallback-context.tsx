'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  useActiveAccount,
  useActiveWallet,
  useConnectModal,
  useDisconnect,
} from 'thirdweb/react'
import { ThirdwebProvider } from 'thirdweb/react'
import { EIP1193 } from 'thirdweb/wallets'
import type { Address } from 'viem'
import {
  createHubThirdwebClient,
  getThirdwebChain,
  getThirdwebConnectWallets,
} from '@/lib/wallet/providers/thirdweb'
import { getThirdwebClientId, isThirdwebFallbackEnabled } from '@/lib/wallet/config'

const SESSION_FLAG = 'motus_wallet_connect_thirdweb_fallback'

export type ThirdwebFallbackContextValue = {
  enabled: boolean
  isActive: boolean
  address: Address | null
  eip1193Provider: unknown | null
  connectWithThirdweb: () => Promise<void>
  clearThirdwebFallback: () => Promise<void>
}

const disabledValue: ThirdwebFallbackContextValue = {
  enabled: false,
  isActive: false,
  address: null,
  eip1193Provider: null,
  connectWithThirdweb: async () => {},
  clearThirdwebFallback: async () => {},
}

const ThirdwebFallbackContext = createContext<ThirdwebFallbackContextValue>(disabledValue)

export function useThirdwebFallback(): ThirdwebFallbackContextValue {
  return useContext(ThirdwebFallbackContext)
}

function readSessionFlag(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(SESSION_FLAG) === '1'
}

function writeSessionFlag(active: boolean) {
  if (typeof window === 'undefined') return
  if (active) sessionStorage.setItem(SESSION_FLAG, '1')
  else sessionStorage.removeItem(SESSION_FLAG)
}

function ThirdwebFallbackController({ children }: { children: ReactNode }) {
  const clientId = getThirdwebClientId()
  const client = useMemo(
    () => (clientId ? createHubThirdwebClient(clientId) : null),
    [clientId]
  )
  const hubChain = useMemo(() => getThirdwebChain(), [])
  const account = useActiveAccount()
  const wallet = useActiveWallet()
  const { connect } = useConnectModal()
  const { disconnect } = useDisconnect()
  const [provider, setProvider] = useState<unknown | null>(null)
  const [flagged, setFlagged] = useState(false)

  const address = (account?.address ?? null) as Address | null
  const isActive = flagged && Boolean(address)

  useEffect(() => {
    setFlagged(readSessionFlag())
  }, [])

  useEffect(() => {
    if (address && readSessionFlag()) {
      setFlagged(true)
    }
  }, [address])

  useEffect(() => {
    if (!wallet || !isActive || !client) {
      setProvider(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const eip = EIP1193.toProvider({
          wallet,
          chain: hubChain,
          client,
        })
        if (!cancelled) setProvider(eip)
      } catch {
        if (!cancelled) setProvider(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [wallet, hubChain, client, isActive])

  const connectWithThirdweb = useCallback(async () => {
    if (!client) {
      throw new Error('Thirdweb no está configurado (falta NEXT_PUBLIC_THIRDWEB_CLIENT_ID)')
    }
    await connect({
      client,
      chain: hubChain,
      wallets: getThirdwebConnectWallets(),
      appMetadata: {
        name: 'MotusDAO Hub',
        url: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
    writeSessionFlag(true)
    setFlagged(true)
  }, [client, connect, hubChain])

  const clearThirdwebFallback = useCallback(async () => {
    writeSessionFlag(false)
    setFlagged(false)
    setProvider(null)
    if (wallet) await disconnect(wallet)
  }, [disconnect, wallet])

  const value = useMemo<ThirdwebFallbackContextValue>(
    () => ({
      enabled: true,
      isActive,
      address,
      eip1193Provider: provider,
      connectWithThirdweb,
      clearThirdwebFallback,
    }),
    [address, clearThirdwebFallback, connectWithThirdweb, isActive, provider]
  )

  return (
    <ThirdwebFallbackContext.Provider value={value}>
      {children}
    </ThirdwebFallbackContext.Provider>
  )
}

export function ThirdwebFallbackShell({ children }: { children: ReactNode }) {
  if (!isThirdwebFallbackEnabled()) {
    return (
      <ThirdwebFallbackContext.Provider value={disabledValue}>
        {children}
      </ThirdwebFallbackContext.Provider>
    )
  }

  return (
    <ThirdwebProvider>
      <ThirdwebFallbackController>{children}</ThirdwebFallbackController>
    </ThirdwebProvider>
  )
}