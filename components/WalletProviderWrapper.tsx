'use client'

import type { ReactNode } from 'react'
import { getConfiguredWalletProvider } from '@/lib/wallet/config'
import { WaaPProviderWrapper } from '@/components/WaaPProviderWrapper'
import { PrivyWalletProviderWrapper } from '@/components/wallet/PrivyWalletProviderWrapper'
import { ThirdwebWalletProviderWrapper } from '@/components/wallet/ThirdwebWalletProviderWrapper'

interface WalletProviderWrapperProps {
  children: ReactNode
}

/**
 * Provider-agnostic app wrapper.
 * Toggle with NEXT_PUBLIC_WALLET_PROVIDER=waap|privy|thirdweb (default: waap).
 */
export function WalletProviderWrapper({ children }: WalletProviderWrapperProps) {
  const provider = getConfiguredWalletProvider()

  if (provider === 'privy') {
    return <PrivyWalletProviderWrapper>{children}</PrivyWalletProviderWrapper>
  }

  if (provider === 'thirdweb') {
    return <ThirdwebWalletProviderWrapper>{children}</ThirdwebWalletProviderWrapper>
  }

  return <WaaPProviderWrapper>{children}</WaaPProviderWrapper>
}