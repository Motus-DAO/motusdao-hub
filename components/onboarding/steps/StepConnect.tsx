'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  Wallet, 
  Mail, 
  AlertCircle, 
  CheckCircle,
  Loader,
  X
} from 'lucide-react'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore, isValidCeloAddress } from '@/lib/onboarding-store'
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
  const { ready, authenticated, user, login } = useWaaP()
  const { wallets } = useWaaPWallets()
  const { data, updateData } = useOnboardingStore()
  const [isConnecting, setIsConnecting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<ConnectFormData>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      email: user?.email?.address || user?.google?.email || data.email || '',
      acceptTerms: false,
      acceptPrivacy: false
    },
    mode: 'onChange'
  })

  // Watch email field to update validation
  const watchedEmail = watch('email')

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
        updateData({ 
          email: emailToStore,
          eoaAddress: eoaAddress,
          privyId: user.id,
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
    console.log('StepConnect onSubmit Debug:', {
      formData,
      canProceed,
      authenticated,
      eoaAddress,
      isValid,
      privyEmail: user?.email?.address || user?.google?.email,
      formEmail: formData.email
    })
    
    // Update store with email (from WaaP or form input)
    const emailToSave = privyEmail || formData.email
    if (emailToSave && emailToSave !== data.email) {
      updateData({ email: emailToSave })
    }
    
    onNext()
  }

  // Get user email - prioritize WaaP email, then form input
  const privyEmail = user?.email?.address || user?.google?.email
  const formEmail = watchedEmail || ''
  const finalEmail = privyEmail || formEmail
  const hasEmail = !!finalEmail && finalEmail.includes('@')
  
  // Allow proceeding if we have EOA address, email, and terms accepted
  // Smart wallet will be created by ZeroDev
  const canProceed = authenticated && eoaAddress && isValid && isValidCeloAddress(eoaAddress) && hasEmail


  // Debug logs
  console.log('StepConnect Debug:', {
    authenticated,
    eoaAddress,
    isValid,
    userEmail: user?.email?.address || user?.google?.email,
    canProceed
  })

  // Show login screen if not authenticated
  if (!authenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full max-w-2xl mx-auto"
      >
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
                {isConnecting ? 'Conectando...' : ready ? 'Iniciar sesión con email' : 'Cargando...'}
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
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
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
      className="w-full max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">¡Cuenta Verificada!</h2>
          <p className="text-muted-foreground">
            Tu email y wallet están listos. Acepta los términos para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    // Show email from WaaP (read-only)
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {privyEmail}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Email verificado por WaaP
                      </p>
                    </div>
                  ) : (
                    // Show input field if no email from WaaP
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

          {/* Terms and Privacy */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                {...register('acceptTerms')}
                type="checkbox"
                id="acceptTerms"
                className="mt-1 w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500 focus:ring-2"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-300">
                Acepto los{' '}
                <a href="/terms" className="text-mauve-400 hover:text-mauve-300 underline">
                  términos y condiciones
                </a>{' '}
                de MotusDAO *
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-red-400 text-sm flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.acceptTerms.message}</span>
              </p>
            )}

            <div className="flex items-start space-x-3">
              <input
                {...register('acceptPrivacy')}
                type="checkbox"
                id="acceptPrivacy"
                className="mt-1 w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500 focus:ring-2"
              />
              <label htmlFor="acceptPrivacy" className="text-sm text-gray-300">
                Acepto la{' '}
                <a href="/privacy" className="text-mauve-400 hover:text-mauve-300 underline">
                  política de privacidad
                </a>{' '}
                y el manejo de mis datos *
              </label>
            </div>
            {errors.acceptPrivacy && (
              <p className="text-red-400 text-sm flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.acceptPrivacy.message}</span>
              </p>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Atrás
            </button>
            
            <CTAButton
              type="submit"
              disabled={!canProceed}
              className="flex items-center space-x-2"
            >
              <span>Continuar</span>
            </CTAButton>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  )
}
