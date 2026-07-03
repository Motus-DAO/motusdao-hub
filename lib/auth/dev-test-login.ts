import type { AuthProvider, Role } from '@prisma/client'
import type { AuthContext } from './session'

/**
 * Dev-only quick login for local intake / profile testing without a new email or wallet.
 *
 * Enable in .env.local:
 *   DEV_TEST_LOGIN_ENABLED=1
 *   DEV_TEST_LOGIN_EMAIL=you@example.com   # optional default
 *
 * NEVER enable in production.
 */
export function isDevTestLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_TEST_LOGIN_ENABLED === '1'
  )
}

export function getDefaultDevTestLoginEmail(): string | null {
  const email = process.env.DEV_TEST_LOGIN_EMAIL?.trim()
  return email || null
}

export type DevTestLoginUser = {
  userId: string
  email: string
  eoaAddress: string
  role: Role
  authProvider: AuthProvider | null
  authProviderId: string | null
}

export function toDevTestAuthContext(user: DevTestLoginUser): AuthContext {
  return {
    userId: user.userId,
    eoaAddress: user.eoaAddress.toLowerCase(),
    role: user.role,
    authProvider: user.authProvider,
  }
}
