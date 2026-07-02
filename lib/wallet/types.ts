import type { Address } from 'viem'

export type WalletProviderId = 'waap' | 'privy' | 'external' | 'unknown'

export type WalletUser = {
  id: string
  email?: { address: string }
  phone?: { number: string }
  google?: { email: string }
  wallet?: { address: string }
}

export type WalletInfo = {
  address: Address
  walletClientType: 'waap' | 'external'
  chainId: string
  connected: boolean
}

export type WalletAuthState = {
  ready: boolean
  authenticated: boolean
  user: WalletUser | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

export type WalletProviderState = {
  provider: unknown | null
  isReady: boolean
}
