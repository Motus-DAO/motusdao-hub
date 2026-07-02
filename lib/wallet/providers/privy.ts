import { celoMainnet } from '@/lib/celo'
import type { PrivyClientConfig } from '@privy-io/react-auth'

/**
 * Shared Privy client config for MotusDAO Hub (Celo mainnet).
 */
export function getPrivyClientConfig(): PrivyClientConfig {
  return {
    loginMethods: ['email', 'wallet', 'google'],
    appearance: {
      theme: 'dark',
    },
    embeddedWallets: {
      ethereum: {
        createOnLogin: 'users-without-wallets',
      },
    },
    supportedChains: [celoMainnet],
    defaultChain: celoMainnet,
  }
}
