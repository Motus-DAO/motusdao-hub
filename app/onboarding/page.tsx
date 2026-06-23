import { redirect } from 'next/navigation'
import { ONBOARDING_ROUTE } from '@/lib/onboarding-routes'

export default function OnboardingPage() {
  redirect(ONBOARDING_ROUTE)
}
