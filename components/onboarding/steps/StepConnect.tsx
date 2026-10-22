'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  Wallet, 
  Mail, 
  AlertCircle, 
  CheckCircle,
  Check,
  Loader,
  X
} from 'lucide-react'
import { useWallet, useWallets, getWalletIdentity } from '@/lib/wallet'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { useOnboardingStore, isValidCeloAddress } from '@/lib/onboarding-store'
import { getConnectBlockers, onboardingBackButtonClass } from '@/lib/onboarding-ui'
import { releaseHiddenWaapOverlayInput, releaseWaapOverlayInput } from '@/lib/wallet/waap-modal-recovery'
import { celoMainnet } from '@/lib/celo'
import { 
  getEOAAddress
} from '@/lib/wallet-utils'

const connectSchema = z.object({
  email: z.string()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Debe ser un correo electrónico válido'),
  acceptTerms: z.boolean()
    .refine(val => val === true, 'Debes aceptar los términos y condiciones'),
  acceptPrivacy: z.boolean()
    .refine(val => val === true, 'Debes aceptar la política de privacidad')
})

type ConnectFormData = z.infer<typeof connectSchema>

interface StepConnectProps {
  onNext: () => void
  onBack: () => void
}

export function StepConnect({ onNext, onBack }: StepConnectProps) {
  const { ready, authenticated, user, login, providerId, requestSharedEmail } = useWallet()
  const { wallets } = useWallets()
  const { data, updateData } = useOnboardingStore()
  const [isConnecting, setIsConnecting] = useState(false)
  const [siweSessionReady, setSiweSessionReady] = useState(false)
  const [connectBlockers, setConnectBlockers] = useState<string[]>([])
  const emailRequestAttemptedRef = useRef(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid }
  } = useForm<ConnectFormData>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      email: user?.email?.address || user?.google?.email || data.email || '',
      acceptTerms: data.consentToTerms === true,
      acceptPrivacy: data.consentToPrivacy === true
    },
    mode: 'onChange'
  })

  const toggleConsent = (field: 'acceptTerms' | 'acceptPrivacy', next: boolean) => {
    setValue(field, next, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    updateData(field === 'acceptTerms' ? { consentToTerms: next } : { consentToPrivacy: next })
  }

  // Watch email field to update validation
  const watchedEmail = watch('email')
  const acceptTerms = watch('acceptTerms')
  const acceptPrivacy = watch('acceptPrivacy')

  // Get user email - prioritize WaaP email, then form input
  const privyEmail = user?.email?.address || user?.google?.email

  // A restored WaaP session may have an address but no locally cached email.
  // Ask once for WaaP's verified email; the SDK owns the required consent UI.
  useEffect(() => {
    if (!authenticated) {
      emailRequestAttemptedRef.current = false
      return
    }

    const hasEmbeddedWaapWallet = wallets.some(
      (wallet) => wallet.walletClientType === 'waap'
    )
    if (
      !hasEmbeddedWaapWallet ||
      privyEmail ||
      watchedEmail?.includes('@') ||
      emailRequestAttemptedRef.current ||
      !requestSharedEmail
    ) {
      return
    }

    emailRequestAttemptedRef.current = true
    void requestSharedEmail().then((email) => {
      if (email?.includes('@')) {
        setValue('email', email, { shouldValidate: true })
      }
    })
  }, [
    authenticated,
    privyEmail,
    requestSharedEmail,
    setValue,
    wallets,
    watchedEmail,
  ])

  // Get the EOA address - prioritizes external wallet (MetaMask) over embedded wallet
  const eoaAddress = getEOAAddress(wallets)
  
  // Log wallet detection for debugging
  useEffect(() => {
    if (authenticated && ready && wallets.length > 0) {
      console.log('🔍 Wallet Detection Debug (StepConnect - EOA only):', {
        totalWallets: wallets.length,
        eoaAddress,
        allWallets: wallets.map(w => ({
          address: w.address,
          type: w.walletClientType,
          chainId: w.chainId
        }))
      })
    }
  }, [authenticated, ready, wallets, eoaAddress])

  // Update store when user data is available
  // Store EOA address - smart wallet will be created by ZeroDev
  useEffect(() => {
    if (authenticated && user && eoaAddress) {
      const privyEmail = user.email?.address || user.google?.email
      const formEmail = watchedEmail || ''
      const emailToStore = privyEmail || formEmail
      const celoChain = celoMainnet
      
      // Determine wallet type based on whether it's external or WaaP embedded
      const externalWallet = wallets.find(w => w.walletClientType === 'external')
      const walletType = externalWallet ? 'external' : 'embedded'
      
      console.log('📝 StepConnect - Storing EOA address:', {
        authenticated,
        privyEmail,
        formEmail,
        emailToStore,
        eoaAddress,
        walletType,
        currentDataEmail: data.email,
        currentDataEoa: data.eoaAddress,
        celoChainId: celoChain.id,
        note: 'EOA stored - smart wallet will be created by ZeroDev'
      })
      
      // Validate Celo address format
      const isValidAddress = isValidCeloAddress(eoaAddress)
      
      // Store the EOA address and email - smart wallet will be created by ZeroDev
      // Only update if email is valid and different from stored
      if (emailToStore && emailToStore.includes('@') && (emailToStore !== data.email || eoaAddress !== data.eoaAddress)) {
        const walletIdentity = getWalletIdentity(user, providerId)
        updateData({ 
          email: emailToStore,
          eoaAddress: eoaAddress,
          authProvider: walletIdentity?.authProvider,
          authProviderId: walletIdentity?.authProviderId,
          celoChainId: celoChain.id,
          walletType: walletType
        })
        console.log('✅ Updated store with EOA address and email:', { 
          email: emailToStore, 
          eoaAddress: eoaAddress,
          walletType: walletType,
          celoChainId: celoChain.id,
          isValidAddress,
          note: 'Smart wallet will be created by ZeroDev'
        })
      }
    }
  }, [authenticated, user, eoaAddress, watchedEmail, data.email, data.eoaAddress, updateData, wallets])

  // Keep react-hook-form in sync when WaaP provides the email (field is read-only in UI)
  useEffect(() => {
    if (privyEmail) {
      setValue('email', privyEmail, { shouldValidate: true })
    }
  }, [privyEmail, setValue])

  // Survive a remount after the wallet modal closes. The click itself also writes the store.
  useEffect(() => {
    if (data.consentToTerms === true && acceptTerms !== true) {
      setValue('acceptTerms', true, { shouldValidate: true })
    }
    if (data.consentToPrivacy === true && acceptPrivacy !== true) {
      setValue('acceptPrivacy', true, { shouldValidate: true })
    }
  }, [acceptPrivacy, acceptTerms, data.consentToPrivacy, data.consentToTerms, setValue])

  // A hidden WaaP shell keeps a full-screen hit target after signing.
  useEffect(() => {
    if (!authenticated) return
    releaseHiddenWaapOverlayInput()
    if (siweSessionReady) {
      releaseWaapOverlayInput()
    }
    const timer = window.setTimeout(() => {
      releaseHiddenWaapOverlayInput()
      if (siweSessionReady) releaseWaapOverlayInput()
    }, 300)
    return () => window.clearTimeout(timer)
  }, [authenticated, siweSessionReady])

  const handleConnectWallet = async () => {
    if (!ready) return
    
    setIsConnecting(true)
    try {
      await login()
    } catch (error) {
      console.error('Error connecting wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const onSubmit = (formData: ConnectFormData) => {
    const emailToSave = privyEmail || formData.email
    if (emailToSave) {
      const walletIdentity = getWalletIdentity(user, providerId)
      updateData({
        email: emailToSave,
        eoaAddress: eoaAddress || data.eoaAddress,
        authProvider: walletIdentity?.authProvider ?? data.authProvider,
        authProviderId: walletIdentity?.authProviderId ?? data.authProviderId,
      })
    }

    onNext()
  }

  const onInvalid = () => {
    void trigger()
    setConnectBlockers(blockerList)
  }

  const formEmail = watchedEmail || ''
  const finalEmail = privyEmail || formEmail
  const hasEmail = !!finalEmail && finalEmail.includes('@')
  const termsAccepted = acceptTerms === true && acceptPrivacy === true

  const canProceed =
    authenticated &&
    !!eoaAddress &&
    isValidCeloAddress(eoaAddress) &&
    hasEmail &&
    termsAccepted &&
    siweSessionReady

  const blockerList = getConnectBlockers({
    authenticated,
    eoaAddress: eoaAddress ?? undefined,
    hasEmail,
    termsAccepted,
    siweSessionReady,
  })

  const handleContinueAttempt = () => {
    if (canProceed) return
    setConnectBlockers(blockerList)
  }

  // Sync blockers when readiness changes — compare by content to avoid
  // setState loops (getConnectBlockers returns a new array each render).
  useEffect(() => {
    if (canProceed) {
      setConnectBlockers((prev) => (prev.length === 0 ? prev : []))
      return
    }

    const next = getConnectBlockers({
      authenticated,
      eoaAddress: eoaAddress ?? undefined,
      hasEmail,
      termsAccepted,
      siweSessionReady,
    })

    setConnectBlockers((prev) => {
      if (
        prev.length === next.length &&
        prev.every((item, i) => item === next[i])
      ) {
        return prev
      }
      return next
    })
  }, [
    canProceed,
    authenticated,
    eoaAddress,
    hasEmail,
    termsAccepted,
    siweSessionReady,
  ])

  // Show login screen if not authenticated
  if (!authenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="onboarding-hit-target w-full max-w-2xl mx-auto"
      >
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conecta tu cuenta</h2>
            <p className="text-muted-foreground">
              Inicia sesión con tu email para comenzar el proceso de registro
            </p>
          </div>

          <div className="space-y-6">
            <CTAButton
              onClick={handleConnectWallet}
              disabled={!ready || isConnecting}
              className="w-full flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              <span>
                {isConnecting ? 'Conectando...' : ready ? 'Iniciar sesión' : 'Cargando...'}
              </span>
            </CTAButton>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Al continuar, aceptas nuestros{' '}
                <a href="/terms" className="text-mauve-400 hover:text-mauve-300 underline">
                  términos y condiciones
                </a>{' '}
                y{' '}
                <a href="/privacy" className="text-mauve-400 hover:text-mauve-300 underline">
                  política de privacidad
                </a>
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={onBack}
              className={onboardingBackButtonClass}
            >
              Atrás
            </button>
          </div>
        </GlassCard>

      </motion.div>
    )
  }

  // Show verification screen if authenticated
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="onboarding-hit-target w-full max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">¡Cuenta Verificada!</h2>
          <p className="text-muted-foreground">
            Tu email y wallet están listos. Acepta los términos para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="onboarding-hit-target space-y-6">
          {/* Account Information */}
          <div className="space-y-4">
            {/* Email Display/Input */}
            <div className={`p-4 glass rounded-xl ${!hasEmail ? 'border border-red-500/30 bg-red-500/10' : ''}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${hasEmail ? 'bg-green-500' : 'bg-red-500'}`}>
                  {hasEmail ? (
                    <Mail className="w-5 h-5 text-white" />
                  ) : (
                    <X className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Correo Electrónico *
                  </label>
                  {privyEmail ? (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {privyEmail}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Email verificado por WaaP
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        {...register('email')}
                        type="email"
                        id="email"
                        placeholder="tu@email.com"
                        className={`w-full px-4 py-3 glass border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                          errors.email 
                            ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' 
                            : 'border-white/10 focus:ring-mauve-500 focus:border-mauve-500'
                        }`}
                      />
                      {errors.email && (
                        <p className="text-red-400 text-xs mt-1 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.email.message}</span>
                        </p>
                      )}
                      {!errors.email && !hasEmail && (
                        <p className="text-xs text-red-400 mt-1">
                          Se requiere un correo electrónico para continuar
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {hasEmail && (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                )}
                {!hasEmail && !privyEmail && (
                  <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                )}
              </div>
            </div>

            {/* Wallet Display */}
            <div className="flex items-center justify-between p-4 glass rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Wallet Conectada (EOA)</p>
                  <p className="text-sm text-muted-foreground">
                    {eoaAddress ? `${eoaAddress.slice(0, 6)}...${eoaAddress.slice(-4)}` : 'No conectada'}
                  </p>
                </div>
              </div>
              {eoaAddress && <CheckCircle className="w-5 h-5 text-green-400" />}
            </div>
          </div>

          <div
            className="space-y-4"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <SiweSessionBanner compact onReadyChange={setSiweSessionReady} />
          </div>

          {/* Terms and Privacy.
              The whole sentence is the control. A link inside the label was
              taking the click and never toggled the box. */}
          <div className="onboarding-hit-target space-y-4">
            <ConsentCheck
              checked={acceptTerms === true}
              onToggle={() => toggleConsent('acceptTerms', acceptTerms !== true)}
            >
              Acepto los{' '}
              <span className="text-mauve-400 underline">términos y condiciones</span>
              {' '}de MotusDAO *
            </ConsentCheck>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-8 inline-block text-xs text-mauve-400 underline hover:text-mauve-300"
            >
              Leer términos
            </a>
            {errors.acceptTerms && (
              <p className="text-red-400 text-sm flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.acceptTerms.message}</span>
              </p>
            )}

            <ConsentCheck
              checked={acceptPrivacy === true}
              onToggle={() => toggleConsent('acceptPrivacy', acceptPrivacy !== true)}
            >
              Acepto la{' '}
              <span className="text-mauve-400 underline">política de privacidad</span>
              {' '}y el manejo de mis datos *
            </ConsentCheck>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-8 inline-block text-xs text-mauve-400 underline hover:text-mauve-300"
            >
              Leer política
            </a>
            {errors.acceptPrivacy && (
              <p className="text-red-400 text-sm flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.acceptPrivacy.message}</span>
              </p>
            )}

            {!termsAccepted && hasEmail && eoaAddress && (
              <p className="text-sm text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>Marca ambas casillas de términos y privacidad para continuar.</span>
              </p>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="onboarding-hit-target flex flex-wrap items-center justify-between gap-3 pt-6">
            <button
              type="button"
              onClick={onBack}
              className={onboardingBackButtonClass}
            >
              Atrás
            </button>
            
            {!canProceed && connectBlockers.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                <p className="mb-1 font-medium">Para continuar necesitas:</p>
                <ul className="list-inside list-disc space-y-0.5 text-amber-800 dark:text-amber-200/90">
                  {connectBlockers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <CTAButton
              type="submit"
              disabled={!canProceed}
              onClick={handleContinueAttempt}
              className="flex items-center space-x-2"
              aria-disabled={!canProceed}
            >
              <span>Continuar</span>
            </CTAButton>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  )
}

function ConsentCheck({
  checked,
  onToggle,
  children,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="onboarding-hit-target flex w-full items-start gap-3 rounded-lg text-left"
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked
            ? 'border-mauve-400 bg-mauve-500 text-white'
            : 'border-white/40 bg-white/15'
        }`}
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="text-sm leading-6 text-foreground">{children}</span>
    </button>
  )
}
