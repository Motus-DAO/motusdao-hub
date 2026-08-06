import { authFetch } from '@/lib/auth/client'
import type { WalletIdentity } from '@/lib/auth/identity'
import { appendWalletIdentityParams } from '@/lib/wallet/client-identity'

export interface RegistrationStatus {
  registered: boolean
  registrationCompleted: boolean
  onboardingStatus?: string
  role?: string
  userId?: string
}

/**
 * Returns null when the check fails (network/HTTP error) so callers do not
 * treat a transport failure as "user is unregistered".
 */
export async function fetchRegistrationStatus(params: {
  email?: string
  eoaAddress?: string
  identity?: WalletIdentity | null
  /** @deprecated use identity */
  privyId?: string
}): Promise<RegistrationStatus | null> {
  const searchParams = new URLSearchParams()

  if (params.email) searchParams.set('email', params.email)
  if (params.eoaAddress) searchParams.set('eoaAddress', params.eoaAddress)
  appendWalletIdentityParams(searchParams, params.identity)
  if (!params.identity && params.privyId) {
    searchParams.set('privyId', params.privyId)
  }

  try {
    const response = await authFetch(
      `/api/auth/check-registration?${searchParams.toString()}`
    )

    if (!response.ok) {
      console.warn(
        '[registration] check-registration failed:',
        response.status,
        await response.text().catch(() => '')
      )
      return null
    }

    return response.json()
  } catch (error) {
    console.warn('[registration] check-registration error:', error)
    return null
  }
}
