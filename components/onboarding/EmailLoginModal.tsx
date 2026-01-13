'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoginWithEmail, useWaaP } from '@/lib/contexts/WaaPProvider'
import { z } from 'zod'
import { 
  Mail, 
  X, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'

// Validation schemas
const emailSchema = z.string().email('El correo no es válido')
const codeSchema = z.string().length(6, 'El código debe tener 6 dígitos')

interface EmailLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoggedIn: () => void
}

export function EmailLoginModal({ isOpen, onClose, onLoggedIn }: EmailLoginModalProps) {
  const { sendCode, loginWithCode } = useLoginWithEmail()
  const { user, authenticated } = useWaaP()
  
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('email')
      setEmail('')
      setCode('')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  // Check if user is already authenticated (only when modal is open)
  useEffect(() => {
    if (isOpen && authenticated && user) {
      onLoggedIn()
      onClose()
    }
  }, [isOpen, authenticated, user, onLoggedIn, onClose])

  const validateEmail = () => {
    try {
      emailSchema.parse(email)
      return true
    } catch {
      return false
    }
  }

  const validateCode = () => {
    try {
      codeSchema.parse(code)
      return true
    } catch {
      return false
    }
  }

  const handleSendCode = async () => {
    if (!validateEmail()) {
      setError('El correo no es válido')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await sendCode({ email })
      setStep('code')
      setSuccess(true)
    } catch (err: unknown) {
      console.error('Error sending code:', err)
      setError('No pudimos enviar el código. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!validateCode()) {
      setError('El código debe tener 6 dígitos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await loginWithCode({ code })
      // The useEffect will handle the success case
    } catch (err: unknown) {
      console.error('Error verifying code:', err)
      setError('Código inválido o vencido.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setCode('')
    setError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    setStep('email')
    setEmail('')
    setCode('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md"
        >
          <GlassCard className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-mauve-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <GradientText className="text-xl font-bold">
                    Iniciar Sesión
                  </GradientText>
                  <p className="text-sm text-muted-foreground">
                    {step === 'email' ? 'Ingresa tu correo' : 'Verifica tu código'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/15 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {step === 'email' ? (
                <motion.div
                  key="email-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Correo electrónico
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
                      disabled={loading}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Te enviaremos un código de verificación para iniciar sesión de forma segura.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="code-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium mb-2">
                      Código de verificación
                    </label>
                    <input
                      id="code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition text-center text-2xl tracking-widest"
                      disabled={loading}
                      maxLength={6}
                    />
                  </div>

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-green-400 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Te enviamos un código a {email}. Revisa tu bandeja y spam.</span>
                    </motion.div>
                  )}

                  <button
                    onClick={handleBackToEmail}
                    className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Cambiar correo</span>
                  </button>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {step === 'email' ? (
                  <CTAButton
                    onClick={handleSendCode}
                    disabled={!email || loading || !validateEmail()}
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Enviar código</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </CTAButton>
                ) : (
                  <CTAButton
                    onClick={handleVerifyCode}
                    disabled={!code || loading || !validateCode()}
                    className="flex-1 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Verificar e ingresar</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </CTAButton>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
