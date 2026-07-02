'use client'

import type { ReactNode } from 'react'
import { OnboardingGuard } from '@/components/onboarding/OnboardingGuard'
import { AppSessionProvider } from '@/components/auth/AppSessionProvider'

interface WalletAuthShellProps {
  children: ReactNode
}

/**
 * Provider-agnostic session + onboarding shell shared by WaaP and Privy trees.
 */
export function WalletAuthShell({ children }: WalletAuthShellProps) {
  return (
    <AppSessionProvider>
      <OnboardingGuard>{children}</OnboardingGuard>
    </AppSessionProvider>
  )
}
