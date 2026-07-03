'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { useWallet } from '@/lib/wallet'

type DevLoginOption = {
  email: string
  role: string
}

type DevLoginConfig = {
  enabled: boolean
  defaultEmail?: string | null
  options?: DevLoginOption[]
}

type DevLoginUser = {
  userId: string
  email: string
  eoaAddress: string
  role: string
  authProvider: string | null
  authProviderId: string | null
}

type Props = {
  onLoggedIn?: () => void
  className?: string
}

export function DevTestLoginPanel({ onLoggedIn, className }: Props) {
  const { bootstrapTestSession } = useWallet()
  const [config, setConfig] = useState<DevLoginConfig>({ enabled: false })
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/auth/dev-test-login')
      .then((res) => res.json())
      .then((data: DevLoginConfig) => {
        if (!cancelled) setConfig(data)
      })
      .catch(() => {
        if (!cancelled) setConfig({ enabled: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loginAs = useCallback(
    async (email: string) => {
      setLoadingEmail(email)
      setError(null)
      try {
        const response = await fetch('/api/auth/dev-test-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error((data as { error?: string }).error || 'No se pudo iniciar sesión de prueba')
        }

        const user = (data as { user: DevLoginUser }).user
        await bootstrapTestSession?.({
          id: user.authProviderId || `waap_${user.eoaAddress.slice(2, 10)}`,
          email: user.email,
          eoaAddress: user.eoaAddress,
          role: user.role,
        })

        onLoggedIn?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de login de prueba')
      } finally {
        setLoadingEmail(null)
      }
    },
    [bootstrapTestSession, onLoggedIn]
  )

  if (!config.enabled) return null

  const options =
    config.options && config.options.length > 0
      ? config.options
      : config.defaultEmail
        ? [{ email: config.defaultEmail, role: 'user' }]
        : []

  if (options.length === 0) return null

  return (
    <div
      className={`ui-status-banner rounded-xl border border-dashed border-mauve-400/40 bg-mauve-500/10 px-4 py-3 text-sm ${className ?? ''}`}
    >
      <p className="mb-2 font-medium text-mauve-200">Modo desarrollo — acceso rápido</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Restaura wallet + sesión SIWE con cuentas de prueba ya registradas. No crea usuarios nuevos.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <CTAButton
            key={option.email}
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={loadingEmail !== null}
            onClick={() => void loginAs(option.email)}
          >
            {loadingEmail === option.email ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : null}
            {option.role}: {option.email}
          </CTAButton>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  )
}
