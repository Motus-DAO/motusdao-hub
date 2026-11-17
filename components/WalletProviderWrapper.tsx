'use client'

import type { ReactNode } from 'react'
import { getConfiguredWalletProvider } from '@/lib/wallet/config'
import { WaaPProviderWrapper } from '@/components/WaaPProviderWrapper'
import { ThirdwebWalletProviderWrapper } from '@/components/wallet/ThirdwebWalletProviderWrapper'

interface WalletProviderWrapperProps {
  children: ReactNode
}

/**
 * Provider-agnostic app wrapper.
 * Toggle with NEXT_PUBLIC_WALLET_PROVIDER=waap|thirdweb (default: waap).
 */
export function WalletProviderWrapper({ children }: WalletProviderWrapperProps) {
  const provider = getConfiguredWalletProvider()

  if (provider === 'thirdweb') {
    return <ThirdwebWalletProviderWrapper>{children}</ThirdwebWalletProviderWrapper>
  }

  return <WaaPProviderWrapper>{children}</WaaPProviderWrapper>
}