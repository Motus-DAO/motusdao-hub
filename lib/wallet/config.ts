export type ConfiguredWalletProvider = 'waap' | 'privy'

const VALID_PROVIDERS = new Set<ConfiguredWalletProvider>(['waap', 'privy'])

/**
 * Active wallet vendor for the client bundle.
 * Set `NEXT_PUBLIC_WALLET_PROVIDER=privy` to A/B against WaaP (default).
 */
export function getConfiguredWalletProvider(): ConfiguredWalletProvider {
  const raw = process.env.NEXT_PUBLIC_WALLET_PROVIDER?.toLowerCase()
  if (raw && VALID_PROVIDERS.has(raw as ConfiguredWalletProvider)) {
    return raw as ConfiguredWalletProvider
  }
  return 'waap'
}

export function getPrivyAppId(): string | undefined {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim()
  return appId || undefined
}

/**
 * WalletConnect Cloud project id. Silk/WaaP docs use
 * NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID; this repo historically used
 * NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. Accept both.
 */
export function getWalletConnectProjectId(): string | undefined {
  const projectId = (
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
  )?.trim()
  return projectId || undefined
}
