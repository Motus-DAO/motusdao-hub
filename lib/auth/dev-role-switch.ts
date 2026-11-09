/**
 * Local-only escape hatch for testing both roles with one wallet.
 * Production never enables it: NODE_ENV must not be production.
 */
export function isRoleSwitcherDevBypass(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.ROLE_SWITCHER_DEV === 'true'
  )
}
