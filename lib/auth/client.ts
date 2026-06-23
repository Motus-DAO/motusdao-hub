import {
  getActiveSignerAddress,
  isUserRejectedSignError,
  signSiweMessage,
  SignMessageError,
} from './signing'

export { isUserRejectedSignError, SignMessageError }

/**
 * Authenticated fetch — always sends session cookie.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
  })
}

export type AppSession = {
  authenticated: boolean
  userId: string | null
  eoaAddress: string | null
  role: string | null
  authProvider: string | null
}

export async function fetchAppSession(): Promise<AppSession> {
  const response = await authFetch('/api/auth/me')
  if (!response.ok) {
    return {
      authenticated: false,
      userId: null,
      eoaAddress: null,
      role: null,
      authProvider: null,
    }
  }

  const data = await response.json()
  return {
    authenticated: true,
    userId: data.userId ?? null,
    eoaAddress: data.eoaAddress ?? null,
    role: data.role ?? null,
    authProvider: data.authProvider ?? null,
  }
}

export async function establishSiweSession(params: {
  waapProvider: unknown
  authProvider?: 'waap' | 'privy' | 'external'
  authProviderId?: string
  eoaAddress?: string
}): Promise<boolean> {
  const { waapProvider, authProvider, authProviderId } = params

  const activeAddress = await getActiveSignerAddress(waapProvider)

  const nonceResponse = await authFetch(
    `/api/auth/nonce?address=${encodeURIComponent(activeAddress)}`
  )
  if (!nonceResponse.ok) {
    const body = await nonceResponse.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error || 'Failed to request SIWE nonce'
    )
  }

  const { message } = await nonceResponse.json()
  const signature = await signSiweMessage(waapProvider, message, activeAddress)

  const verifyResponse = await authFetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      signature,
      authProvider,
      authProviderId,
    }),
  })

  if (!verifyResponse.ok) {
    const body = await verifyResponse.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error || 'Session verification failed'
    )
  }

  return true
}

export async function logoutAppSession(): Promise<void> {
  await authFetch('/api/auth/logout', { method: 'POST' })
}
