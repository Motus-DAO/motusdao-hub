'use client'

import {
  useWaaP,
  useWaaPProvider,
  useWaaPWallets,
} from '@/lib/contexts/WaaPProvider'
import type {
  WalletAuthState,
  WalletInfo,
  WalletProviderState,
  WalletProviderId,
} from './types'

export type { WalletAuthProvider } from './provider'
export type { WalletInfo, WalletProviderId, WalletUser } from './types'
export { getWalletIdentity, appendWalletIdentityParams } from './client-identity'

export { useLoginWithEmail } from '@/lib/contexts/WaaPProvider'

function inferProvider(wallets: WalletInfo[]): WalletProviderId {
  if (wallets.some((w) => w.walletClientType === 'external')) return 'external'
  if (wallets.some((w) => w.walletClientType === 'waap')) return 'waap'
  return 'unknown'
}

export function useWallet(): WalletAuthState & { providerId: WalletProviderId } {
  const auth = useWaaP()
  const { wallets } = useWaaPWallets()
  return {
    ready: auth.ready,
    authenticated: auth.authenticated,
    user: auth.user,
    login: auth.login,
    logout: auth.logout,
    providerId: inferProvider(wallets as WalletInfo[]),
  }
}

export function useWallets(): { wallets: WalletInfo[] } {
  const { wallets } = useWaaPWallets()
  return { wallets: wallets as WalletInfo[] }
}

export function useWalletProvider(): WalletProviderState {
  const { provider, isReady } = useWaaPProvider()
  return { provider, isReady }
}
