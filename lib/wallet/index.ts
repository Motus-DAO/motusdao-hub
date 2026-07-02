'use client'

import { useWalletContext } from './WalletContext'
import type {
  WalletAuthState,
  WalletInfo,
  WalletProviderState,
  WalletProviderId,
} from './types'

export type { WalletAuthProvider } from './provider'
export type { WalletInfo, WalletProviderId, WalletUser } from './types'
export { getConfiguredWalletProvider, getPrivyAppId } from './config'
export { getWalletIdentity, appendWalletIdentityParams } from './client-identity'

function resolveProviderId(
  configuredProvider: 'waap' | 'privy',
  wallets: WalletInfo[]
): WalletProviderId {
  if (wallets.some((wallet) => wallet.walletClientType === 'external')) {
    return 'external'
  }
  return configuredProvider
}

export function useWallet(): WalletAuthState & {
  providerId: WalletProviderId
  configuredProvider: 'waap' | 'privy'
  setupError?: string | null
} {
  const ctx = useWalletContext()

  return {
    ready: ctx.ready,
    authenticated: ctx.authenticated,
    user: ctx.user,
    login: ctx.login,
    logout: ctx.logout,
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
