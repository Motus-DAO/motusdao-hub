import type { WalletIdentity } from '@/lib/auth/identity'
import type { WalletProviderId, WalletUser } from './types'

/** Email from WaaP/Privy OAuth — absent for external wallets (MetaMask). */
export function getWaapAuthEmail(
  user: WalletUser | null | undefined
): string | null {
  const email = user?.email?.address || user?.google?.email
  if (!email || !email.includes('@')) return null
  return email
}

export function getWalletIdentity(
  user: WalletUser | null | undefined,
  providerId: WalletProviderId
): WalletIdentity | null {
  if (!user?.id) return null

  const authProvider =
    providerId === 'privy'
      ? 'privy'
      : providerId === 'external'
        ? 'external'
        : 'waap'

  return {
    authProvider,
    authProviderId: user.id,
  }
}

export function appendWalletIdentityParams(
  params: URLSearchParams,
  identity: WalletIdentity | null | undefined
): void {
  if (!identity) return
  params.set('authProvider', identity.authProvider)
  params.set('authProviderId', identity.authProviderId)
}
