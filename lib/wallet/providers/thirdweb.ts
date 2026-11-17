import { createThirdwebClient } from 'thirdweb'
import { defineChain } from 'thirdweb/chains'
import { createWallet, inAppWallet, type Wallet } from 'thirdweb/wallets'
import { celoMainnet } from '@/lib/celo'
import { getThirdwebClientId, getWalletConnectProjectId } from '@/lib/wallet/config'

export const THIRDWEB_SETUP_MESSAGE =
  'NEXT_PUBLIC_THIRDWEB_CLIENT_ID is required when NEXT_PUBLIC_WALLET_PROVIDER=thirdweb'

/**
 * Shared Thirdweb client config for MotusDAO Hub (Celo mainnet).
 */
export function getThirdwebChain() {
  const rpcUrl = celoMainnet.rpcUrls.default.http[0]
  return defineChain({
    id: celoMainnet.id,
    name: celoMainnet.name,
    nativeCurrency: celoMainnet.nativeCurrency,
    rpc: rpcUrl,
    blockExplorers: celoMainnet.blockExplorers?.default
      ? [{ name: celoMainnet.blockExplorers.default.name, url: celoMainnet.blockExplorers.default.url }]
      : undefined,
  })
}

export function createHubThirdwebClient(clientId: string) {
  return createThirdwebClient({ clientId })
}

export function tryCreateHubThirdwebClient(): ReturnType<typeof createThirdwebClient> | null {
  const clientId = getThirdwebClientId()
  if (!clientId) return null
  return createHubThirdwebClient(clientId)
}

export function getThirdwebConnectWallets(): Wallet[] {
  const wallets: Wallet[] = [
    inAppWallet({
      auth: {
        options: ['email', 'google'],
      },
    }),
    createWallet('io.metamask'),
  ]

  if (getWalletConnectProjectId()) {
    wallets.push(createWallet('walletConnect'))
  }

  return wallets
}