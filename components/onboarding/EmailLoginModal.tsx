'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/lib/wallet'
import { Loader2, X, Wallet } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'

interface EmailLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoggedIn: () => void
}

/**
 * Legacy name kept for call sites. Opens Human Tech WaaP login — not the old
 * Privy email+OTP form.
 */
export function EmailLoginModal({ isOpen, onClose, onLoggedIn }: EmailLoginModalProps) {
  const { login, authenticated, ready } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && authenticated) {
      onLoggedIn()
      onClose()
    }
  }, [isOpen, authenticated, onLoggedIn, onClose])

  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
      setError(null)
      return
    }

    // Auto-open Human Tech when this legacy modal is shown.
    let cancelled = false
    const run = async () => {
      if (!ready || authenticated) return
      setLoading(true)
      setError(null)
      try {
        await login()
        if (!cancelled) {
          onLoggedIn()
          onClose()
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[EmailLoginModal] WaaP login failed:', err)
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo abrir el inicio de sesión de Human Tech.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isOpen, ready, authenticated, login, onLoggedIn, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md"
        >
          <GlassCard className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-mauve-500 to-iris-500">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <GradientText className="text-xl font-bold">Iniciar Sesión</GradientText>
                  <p className="text-sm text-muted-foreground">Wallet Human Tech</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 transition-colors hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-center">
              {loading ? (
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Abriendo el modal de Human Tech…
                </p>
              ) : error ? (
                <>
                  <p className="text-sm text-red-300">{error}</p>
                  <CTAButton
                    className="w-full"
                    onClick={() => {
                      setError(null)
                      setLoading(true)
                      void login()
                        .then(() => {
                          onLoggedIn()
                          onClose()
                        })
                        .catch((err) => {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'No se pudo abrir el inicio de sesión.'
                          )
                        })
                        .finally(() => setLoading(false))
                    }}
                  >
                    Reintentar
                  </CTAButton>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Usa el modal de Human Tech para continuar con email, teléfono o redes.
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
