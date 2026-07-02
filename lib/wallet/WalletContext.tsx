'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { ConfiguredWalletProvider } from './config'
import type { WalletInfo, WalletUser } from './types'

export type WalletEmailLogin = {
  sendCode: (params: { email: string }) => Promise<void>
  loginWithCode: (params: { code: string }) => Promise<void>
}

export type WalletContextValue = {
  configuredProvider: ConfiguredWalletProvider
  ready: boolean
  authenticated: boolean
  user: WalletUser | null
  login: () => Promise<void>
  logout: () => Promise<void>
  wallets: WalletInfo[]
  provider: unknown | null
  isProviderReady: boolean
  emailLogin: WalletEmailLogin
  setupError?: string | null
}

const noopEmailLogin: WalletEmailLogin = {
  sendCode: async () => {
    throw new Error('Wallet email login is not available')
  },
  loginWithCode: async () => {
    throw new Error('Wallet email login is not available')
  },
}

const defaultValue: WalletContextValue = {
  configuredProvider: 'waap',
  ready: false,
  authenticated: false,
  user: null,
  login: async () => {},
  logout: async () => {},
  wallets: [],
  provider: null,
  isProviderReady: false,
  emailLogin: noopEmailLogin,
  setupError: null,
}

const WalletContext = createContext<WalletContextValue>(defaultValue)

export function WalletContextProvider({
  value,
  children,
}: {
  value: WalletContextValue
  children: ReactNode
}) {
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWalletContext(): WalletContextValue {
  return useContext(WalletContext)
}
