'use client'

import { useCallback } from 'react'
import { useUIStore } from '@/lib/store'
import { useWalletContext } from './WalletContext'
import type {
  WalletAuthState,
  WalletInfo,
  WalletProviderState,
  WalletProviderId,
} from './types'

export type { WalletAuthProvider } from './provider'
export type { WalletInfo, WalletProviderId, WalletUser } from './types'
export {
  getConfiguredWalletProvider,
  getThirdwebClientId,
  getThirdwebPasskeyDomain,
  getWalletConnectProjectId,
  isThirdwebFallbackEnabled,
} from './config'
export {
  getWalletIdentity,
  appendWalletIdentityParams,
  getWaapAuthEmail,
} from './client-identity'

function resolveProviderId(
  configuredProvider: 'waap' | 'thirdweb',
  wallets: WalletInfo[]
): WalletProviderId {
  if (wallets.some((wallet) => wallet.walletClientType === 'thirdweb')) {
    return 'thirdweb'
  }
  if (wallets.some((wallet) => wallet.walletClientType === 'external')) {
    return 'external'
  }
  return configuredProvider
}

/** Opens the Safari-aware provider modal (safe from any CTA). */
export function requestMotusLogin(location?: string): Promise<void> {
  return useUIStore.getState().openLoginModal(location ?? 'unknown')
}

export function useWallet(): WalletAuthState & {
  providerId: WalletProviderId
  configuredProvider: 'waap' | 'thirdweb'
  setupError?: string | null
} {
  const ctx = useWalletContext()
  const openLoginModal = useUIStore((s) => s.openLoginModal)

  const login = useCallback(
    () => openLoginModal('use_wallet'),
    [openLoginModal]
  )

  return {
    ready: ctx.ready,
    authenticated: ctx.authenticated,
    user: ctx.user,
    login,
    logout: ctx.logout,
    requestSharedEmail: ctx.requestSharedEmail,
    providerId: resolveProviderId(ctx.configuredProvider, ctx.wallets),
    configuredProvider: ctx.configuredProvider,
    setupError: ctx.setupError,
  }
}

export function useWallets(): { wallets: WalletInfo[] } {
  const { wallets } = useWalletContext()
  return { wallets }
}

export function useWalletProvider(): WalletProviderState {
  const { provider, isProviderReady } = useWalletContext()
  return { provider, isReady: isProviderReady }
}

export function useLoginWithEmail() {
  return useWalletContext().emailLogin
}
