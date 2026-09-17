'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { CTAButton } from './CTAButton'
import { GradientText } from './GradientText'
import { useWallet } from '@/lib/wallet'

interface LoginRequiredModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  const { login, authenticated, ready } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && authenticated) {
      onClose()
    }
  }, [isOpen, authenticated, onClose])

  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await login()
      onClose()
    } catch (err) {
      console.error('[LoginRequiredModal] login failed:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo abrir el inicio de sesión. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard className="relative w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 transition-colors hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <GradientText as="h2" className="mb-4 text-2xl font-bold">
            Inicia Sesión
          </GradientText>
          <p className="mb-6 text-muted-foreground">
            Abriremos el wallet de Human Tech para entrar con email, teléfono o redes.
          </p>

          {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

          <div className="flex flex-col gap-3">
            <CTAButton
              size="lg"
              onClick={() => void handleLogin()}
              disabled={!ready || loading}
              className="w-full gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Abriendo wallet…' : 'Continuar con Human Tech'}
            </CTAButton>
            <CTAButton variant="secondary" size="lg" onClick={onClose} className="w-full">
              Cancelar
            </CTAButton>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
