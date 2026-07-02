import type { WalletIdentity } from '@/lib/auth/identity'
import type { WalletProviderId, WalletUser } from './types'

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
