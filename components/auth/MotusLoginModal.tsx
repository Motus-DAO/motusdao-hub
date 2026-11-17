'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, Wallet, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { CTAButton } from '@/components/ui/CTAButton'
import { GradientText } from '@/components/ui/GradientText'
import { useWallet } from '@/lib/wallet'
import { useThirdwebFallback } from '@/lib/wallet/thirdweb-fallback-context'
import { isThirdwebFallbackEnabled } from '@/lib/wallet/config'
import {
  getDefaultLoginProvider,
  isIosSafari,
  resolveConnectRoute,
} from '@/lib/wallet/safari-connect-route'
import { trackCta } from '@/lib/track-cta'

export type MotusLoginModalProps = {
  isOpen: boolean
  onClose: () => void
  /** For analytics (e.g. topbar, booking). */
  location?: string
}

function providerLabel(id: 'waap' | 'thirdweb'): string {
  return id === 'waap' ? 'Human Tech' : 'Thirdweb'
}

export function MotusLoginModal({
  isOpen,
  onClose,
  location = 'modal',
}: MotusLoginModalProps) {
  const { theme } = useUIStore()
  const { login, authenticated, ready } = useWallet()
  const thirdweb = useThirdwebFallback()
  const [provider, setProvider] = useState<'waap' | 'thirdweb'>(() =>
    getDefaultLoginProvider()
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [usedAlternate, setUsedAlternate] = useState(false)

  const safari = isIosSafari()
  const thirdwebEnabled = isThirdwebFallbackEnabled() && thirdweb.enabled
  const alternate: 'waap' | 'thirdweb' = provider === 'waap' ? 'thirdweb' : 'waap'
  const showSafariHumanNotice = safari && provider === 'waap'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && authenticated) {
      onClose()
    }
  }, [isOpen, authenticated, onClose])

  useEffect(() => {
    if (isOpen) {
      setProvider(getDefaultLoginProvider())
      setUsedAlternate(false)
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const glassCard = cn(
    'relative w-full max-w-md rounded-3xl border p-6 sm:p-8 backdrop-blur-xl backdrop-saturate-150 shadow-lg',
    theme === 'light' &&
      'border-black/10 bg-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.55)]',
    theme === 'dark' &&
      'border-white/14 bg-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
    theme === 'matrix' &&
      'rounded-none border-[var(--matrix-border)] bg-black/90 shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,65,0.1)]'
  )

  const runConnect = async (target: 'waap' | 'thirdweb', choseAlternate: boolean) => {
    setLoading(true)
    setError(null)
    const route = resolveConnectRoute(target, choseAlternate)
    trackCta('Inicia sesión', {
      location,
      connect_route: route,
      provider: target,
    })

    try {
      if (target === 'thirdweb') {
        if (!thirdwebEnabled) {
          throw new Error('Thirdweb no está disponible en este entorno.')
        }
        await thirdweb.connectWithThirdweb()
      } else {
        await login()
      }
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo abrir el inicio de sesión. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="motus-login-title"
      onClick={onClose}
    >
      <div className={glassCard} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 transition-colors hover:bg-foreground/10"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo.svg"
            alt="MotusDAO"
            width={48}
            height={48}
            className="mb-3 h-12 w-12 object-contain"
          />
          <h2 id="motus-login-title" className="text-2xl font-bold tracking-tight">
            <GradientText as="span">Inicia sesión</GradientText>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Una cuenta MotusDAO con tu wallet. Firma un mensaje de verificación
            (sin gas) para entrar.
          </p>
        </div>

        {showSafariHumanNotice ? (
          <div className="mb-4 space-y-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="flex gap-2 text-amber-200/95">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-left leading-relaxed">
                En Safari, Human a veces no termina el inicio de sesión (el
                modal se queda bloqueado). Para iPhone recomendamos{' '}
                <strong>Thirdweb</strong>: es la misma cuenta cuando vinculas
                wallets en Perfil.
              </p>
            </div>
            <CTAButton
              type="button"
              size="sm"
              className="w-full"
              disabled={loading || !thirdwebEnabled}
              onClick={() => {
                setProvider('thirdweb')
                setUsedAlternate(true)
                void runConnect('thirdweb', true)
              }}
            >
              Usar Thirdweb (recomendado)
            </CTAButton>
          </div>
        ) : null}

        {safari && provider === 'thirdweb' ? (
          <p className="mb-4 rounded-xl border border-border/60 bg-foreground/5 px-3 py-2 text-xs text-muted-foreground text-left leading-relaxed">
            En Safari usamos Thirdweb como vía principal. Luego puedes vincular
            Human en Perfil cuando quieras.
          </p>
        ) : null}

        {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

        <div className="flex flex-col gap-3">
          <CTAButton
            type="button"
            size="lg"
            className="w-full gap-2"
            disabled={!ready || loading}
            onClick={() => void runConnect(provider, usedAlternate)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {loading
              ? 'Abriendo…'
              : `Continuar con ${providerLabel(provider)}`}
          </CTAButton>

          {thirdwebEnabled ? (
            <button
              type="button"
              disabled={loading || !ready}
              onClick={() => void runConnect(alternate, true)}
              className="text-sm text-mauve-300 hover:text-mauve-200 underline underline-offset-2 disabled:opacity-40"
            >
              Probar con {providerLabel(alternate)}
            </button>
          ) : null}

          <CTAButton
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={onClose}
          >
            Cancelar
          </CTAButton>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}