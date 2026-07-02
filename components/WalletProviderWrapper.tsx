'use client'

import { WaaPProviderWrapper } from '@/components/WaaPProviderWrapper'

interface WalletProviderWrapperProps {
  children: React.ReactNode
}

/**
 * Provider-agnostic app wrapper.
 * Current backing implementation is WaaP.
 */
export function WalletProviderWrapper({ children }: WalletProviderWrapperProps) {
  return <WaaPProviderWrapper>{children}</WaaPProviderWrapper>
}
