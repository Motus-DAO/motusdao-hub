import type { AuthContext } from './session'

/**
 * Dev-only admin bypass for local testing when SIWE / OAuth is unavailable.
 *
 * Enable in .env.local:
 *   DEV_BYPASS_ADMIN_AUTH=1
 *
 * NEVER set in production. Ignored unless NODE_ENV === 'development'.
 */
export function isDevAdminBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_BYPASS_ADMIN_AUTH === '1'
  )
}

export function getDevBypassAdminContext(): AuthContext {
  return {
    userId: 'dev-bypass-admin',
    eoaAddress: '0x0000000000000000000000000000000000000000',
    role: 'admin',
    authProvider: null,
  }
}
