'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ThirdwebProvider,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useConnectModal,
  useDisconnect,
} from 'thirdweb/react'
import { EIP1193 } from 'thirdweb/wallets'
import type { Address } from 'viem'
import { WalletContextProvider } from '@/lib/wallet/WalletContext'
import { getThirdwebClientId } from '@/lib/wallet/config'
import {
  createHubThirdwebClient,
  getThirdwebChain,
  getThirdwebConnectWallets,
} from '@/lib/wallet/providers/thirdweb'
import type { WalletInfo, WalletUser } from '@/lib/wallet/types'

function isThirdwebInAppWallet(walletId: string | undefined): boolean {
  if (!walletId) return false
  return walletId === 'inApp' || walletId.includes('inApp') || walletId.includes('embedded')
}

function mapThirdwebUser(account: ReturnType<typeof useActiveAccount>): WalletUser | null {
  if (!account?.address) return null
  return {
    id: account.address,
    wallet: { address: account.address },
  }
}

function mapThirdwebWallet(
  wallet: ReturnType<typeof useActiveWallet>,
  chainId: number | undefined
): WalletInfo[] {
  const account = wallet?.getAccount()
  if (!account?.address) return []

  return [
    {
      address: account.address as Address,
      walletClientType: isThirdwebInAppWallet(wallet?.id) ? 'thirdweb' : 'external',
      chainId: chainId ? String(chainId) : '42220',
      connected: true,
    },
  ]
}

interface ThirdwebWalletContextBridgeInnerProps {
  children: ReactNode
  setupError?: string | null
}

function ThirdwebWalletContextBridgeInner({
  children,
  setupError = null,
}: ThirdwebWalletContextBridgeInnerProps) {
  const clientId = getThirdwebClientId()
  const client = useMemo(
    () => (clientId ? createHubThirdwebClient(clientId) : null),
    [clientId]
  )
  const hubChain = useMemo(() => getThirdwebChain(), [])

  const account = useActiveAccount()
  const wallet = useActiveWallet()
  const chain = useActiveWalletChain()
  const { connect, isConnecting } = useConnectModal()
  const { disconnect } = useDisconnect()
  const [provider, setProvider] = useState<unknown | null>(null)
  const [isProviderReady, setIsProviderReady] = useState(false)

  const mappedWallets = useMemo(
    () => mapThirdwebWallet(wallet, chain?.id ?? hubChain.id),
    [wallet, chain?.id, hubChain.id]
  )

  const login = useCallback(async () => {
    if (!client) {
      throw new Error(setupError ?? 'Thirdweb client is not configured')
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
  }, [client, connect, hubChain, setupError])

  const logout = useCallback(async () => {
    if (wallet) {
      await disconnect(wallet)
    }
  }, [disconnect, wallet])

  useEffect(() => {
    if (!client || !wallet) {
      setProvider(null)
      setIsProviderReady(false)
      return
    }

    try {
      const eip1193 = EIP1193.toProvider({
        wallet,
        client,
        chain: chain ?? hubChain,
      })
      setProvider(eip1193)
      setIsProviderReady(Boolean(account?.address))
    } catch {
      setProvider(null)
      setIsProviderReady(false)
    }
  }, [account?.address, chain, client, hubChain, wallet])

  const authenticated = Boolean(account?.address)
  const ready = Boolean(clientId) && !isConnecting

  return (
    <WalletContextProvider
      value={{
        configuredProvider: 'thirdweb',
        ready,
        authenticated,
        user: mapThirdwebUser(account),
        login,
        logout,
        requestSharedEmail: async () => null,
        wallets: mappedWallets,
        provider,
        isProviderReady,
        emailLogin: {
          sendCode: async () => {
            await login()
          },
          loginWithCode: async () => {
            throw new Error('Thirdweb uses embedded login; enter the code in the connect modal')
          },
        },
        setupError,
      }}
    >
      {children}
    </WalletContextProvider>
  )
}

interface ThirdwebWalletContextBridgeProps {
  children: ReactNode
  setupError?: string | null
}

export function ThirdwebWalletContextBridge({
  children,
  setupError = null,
}: ThirdwebWalletContextBridgeProps) {
  return (
    <ThirdwebProvider>
      <ThirdwebWalletContextBridgeInner setupError={setupError}>
        {children}
      </ThirdwebWalletContextBridgeInner>
    </ThirdwebProvider>
  )
}