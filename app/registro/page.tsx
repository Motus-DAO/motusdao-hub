'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWaaP } from '@/lib/contexts/WaaPProvider'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { useOnboardingStore } from '@/lib/onboarding-store'

export default function RegistroPage() {
  const router = useRouter()
  const { authenticated, ready } = useWaaP()
  const { isCompleted } = useOnboardingStore()

  // Redirect to home if registration is already completed
  useEffect(() => {
    if (ready && authenticated && isCompleted) {
      // Small delay to allow the success page to be seen
      const timer = setTimeout(() => {
        router.push('/')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [ready, authenticated, isCompleted, router])

  return (
    <div className="min-h-screen bg-background">
      <OnboardingWizard />
    </div>
  )
}

