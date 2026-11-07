'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { startStripeConnect } from '@/lib/stripe-connect-client'
import { cn } from '@/lib/utils'

export function ConnectOnboardingButton({
  label = 'Conectar Stripe',
  className,
}: {
  label?: string
  className?: string
}) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setOpening(true)
    setError(null)
    try {
      const { url } = await startStripeConnect()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos abrir Stripe.')
      setOpening(false)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <CTAButton type="button" onClick={start} disabled={opening} className="w-full sm:w-auto">
        {opening ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Abriendo Stripe...
          </span>
        ) : (
          label
        )}
      </CTAButton>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
