import type { WalletInfo, WalletProviderId, WalletUser } from './types'

export interface WalletAuthProvider {
  readonly id: WalletProviderId
  getState(): {
    ready: boolean
    authenticated: boolean
    user: WalletUser | null
    wallets: WalletInfo[]
    provider: unknown | null
    isProviderReady: boolean
  }
  login(): Promise<void>
  logout(): Promise<void>
}
