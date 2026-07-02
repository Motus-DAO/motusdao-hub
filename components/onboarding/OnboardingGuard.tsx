'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useWallet, useWallets, getWalletIdentity } from '@/lib/wallet'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { getEOAAddress } from '@/lib/wallet-utils'
import { fetchRegistrationStatus } from '@/lib/registration'
import { isOnboardingExemptPath, ONBOARDING_ROUTE } from '@/lib/onboarding-routes'

interface OnboardingGuardProps {
  children: React.ReactNode
}

function normalizeAddress(address: string | undefined | null): string | null {
  if (!address) return null
  return address.toLowerCase()
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { ready, authenticated, user, providerId } = useWallet()
  const { wallets } = useWallets()
  const pathname = usePathname()
  const router = useRouter()
  const { data, isCompleted, reset, markCompleted } = useOnboardingStore()

  useEffect(() => {
    if (!ready || !authenticated) return

    // Admin and other exempt routes skip registration polling
    if (isOnboardingExemptPath(pathname)) return

    const email = user?.email?.address || user?.google?.email
    const eoaAddress = getEOAAddress(wallets)

    if (!email && !eoaAddress) return

    const storedEmail = data.email
    const storedEoa = data.eoaAddress
    const identityChanged =
      (storedEmail && email && storedEmail !== email) ||
      (normalizeAddress(storedEoa) &&
        normalizeAddress(eoaAddress) &&
        normalizeAddress(storedEoa) !== normalizeAddress(eoaAddress))

    if (identityChanged) {
      reset()
    }

    let cancelled = false

    const verifyRegistration = async () => {
      try {
        const status = await fetchRegistrationStatus({
          email,
          eoaAddress: eoaAddress ?? undefined,
          identity: getWalletIdentity(user, providerId),
        })

        if (cancelled) return

        if (status.registrationCompleted) {
          markCompleted()
        } else if (isCompleted) {
          useOnboardingStore.setState({ isCompleted: false })
        }

        if (!status.registrationCompleted && !isOnboardingExemptPath(pathname)) {
          router.replace(ONBOARDING_ROUTE)
        }
      } catch (error) {
        // Non-fatal: registration check uses session cookie; failures should not block the app
        console.warn('[OnboardingGuard] Registration check failed:', error)
      }
    }

    void verifyRegistration()

    return () => {
      cancelled = true
    }
  }, [
    ready,
    authenticated,
    user?.id,
    user?.email?.address,
    user?.google?.email,
    wallets,
    pathname,
    data.email,
    data.eoaAddress,
    isCompleted,
    reset,
    markCompleted,
    router,
  ])

  return <>{children}</>
}
