import { authFetch } from '@/lib/auth/client'

export interface RegistrationStatus {
  registered: boolean
  registrationCompleted: boolean
  onboardingStatus?: string
  role?: string
  userId?: string
}

const DEFAULT_STATUS: RegistrationStatus = {
  registered: false,
  registrationCompleted: false,
}

export async function fetchRegistrationStatus(params: {
  email?: string
  privyId?: string
  eoaAddress?: string
}): Promise<RegistrationStatus> {
  const searchParams = new URLSearchParams()

  if (params.email) searchParams.set('email', params.email)
  if (params.privyId) searchParams.set('privyId', params.privyId)
  if (params.eoaAddress) searchParams.set('eoaAddress', params.eoaAddress)

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
      return DEFAULT_STATUS
    }

    return response.json()
  } catch (error) {
    console.warn('[registration] check-registration error:', error)
    return DEFAULT_STATUS
  }
}
