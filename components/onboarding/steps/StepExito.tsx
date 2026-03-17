'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  ArrowRight, 
  Home, 
  Bot, 
  GraduationCap,
  Heart,
  Users
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore } from '@/lib/onboarding-store'

interface StepExitoProps {
  onComplete?: () => void
}

export function StepExito({ onComplete }: StepExitoProps) {
  const { role, reset, markCompleted, data } = useOnboardingStore()
  const router = useRouter()
  const hasMarkedCompleted = useRef(false)
  const hasCalledOnComplete = useRef(false)

  // Mark registration as completed when this step is shown (only once)
  useEffect(() => {
    if (!hasMarkedCompleted.current) {
      markCompleted()
      hasMarkedCompleted.current = true
    }
    
    if (onComplete && !hasCalledOnComplete.current) {
      // Call onComplete after a short delay to allow the page to render
      const timer = setTimeout(() => {
        onComplete()
        hasCalledOnComplete.current = true
      }, 100)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - only run once on mount

  // Removed automatic reset - let user stay on success page
  // useEffect(() => {
  //   // Reset onboarding state after successful completion
  //   const timer = setTimeout(() => {
  //     reset()
  //   }, 5000)

  //   return () => clearTimeout(timer)
  // }, [reset])

  const handleRedirect = (path: string) => {
    reset()
    router.push(path)
  }

  const getRoleContent = () => {
    if (role === 'usuario') {
      return {
        title: '🎉 ¡Listo! Tu registro ha sido completado',
        subtitle: 'Bienvenido a MotusDAO. Tu cuenta de usuario está lista para usar.',
        features: [
          { icon: Heart, label: 'Acceso a psicoterapia', description: 'Conecta con profesionales' },
          { icon: Bot, label: 'MotusAI personalizado', description: 'Asistente de IA especializado' },
          { icon: GraduationCap, label: 'Cursos de bienestar', description: 'Recursos para tu salud mental' },
          { icon: Home, label: 'Bitácora privada', description: 'Diario personal seguro' }
        ],
        primaryAction: {
          label: 'Ir a MotusAI',
          path: '/motusai',
          icon: Bot
        },
        secondaryAction: {
          label: 'Ir a Inicio',
          path: '/',
          icon: Home
        }
      }
    } else {
      return {
        title: '🎉 ¡Bienvenido/a a la red profesional de MotusDAO!',
        subtitle: 'Tu cuenta profesional está lista. Accede a todas las herramientas para profesionales.',
        features: [
          { icon: Users, label: 'Gestión de pacientes', description: 'Administra tu cartera de pacientes' },
          { icon: Heart, label: 'Supervisión de casos', description: 'Revisa y supervisa terapias' },
          { icon: GraduationCap, label: 'Certificaciones', description: 'Accede a cursos y certificaciones' },
          { icon: Home, label: 'Red profesional', description: 'Conecta con otros profesionales' }
        ],
        primaryAction: {
          label: 'Ir al Dashboard',
          path: '/',
          icon: Home
        },
        secondaryAction: {
          label: 'Academia',
          path: '/academia',
          icon: GraduationCap
        }
      }
    }
  }

  const content = getRoleContent()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold mb-4"
          >
            {content.title}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-lg"
          >
            {content.subtitle}
          </motion.p>

          {(data.profileNftTxHash || data.profileNftTokenURI || data.eoaAddress) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-4 text-xs text-mauve-300 space-y-1"
            >
              {data.profileNftTokenURI && (
                <p>
                  Metadata en IPFS/Filecoin:{' '}
                  <a
                    href={`https://gateway.lighthouse.storage/ipfs/${data.profileNftTokenURI.replace('ipfs://', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    abrir en Lighthouse/IPFS
                  </a>
                </p>
              )}
              {data.profileNftTxHash ? (
                <p>
                  Registro on-chain:{' '}
                  <a
                    href={`https://celoscan.io/tx/${data.profileNftTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ver transacción en Celoscan
                  </a>
                </p>
              ) : data.eoaAddress && (
                <p>
                  Registro on-chain:{' '}
                  <a
                    href={`https://celoscan.io/address/${data.eoaAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ver tu wallet en Celoscan
                  </a>
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          {content.features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="p-4 glass rounded-xl"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-mauve-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-mauve-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">{feature.label}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <CTAButton
            onClick={() => handleRedirect(content.primaryAction.path)}
            className="flex items-center space-x-2"
          >
            <content.primaryAction.icon className="w-4 h-4" />
            <span>{content.primaryAction.label}</span>
            <ArrowRight className="w-4 h-4" />
          </CTAButton>
          
          <button
            onClick={() => handleRedirect(content.secondaryAction.path)}
            className="flex items-center justify-center space-x-2 px-6 py-3 glass border border-white/10 rounded-xl hover:bg-white/15 transition-colors"
          >
            <content.secondaryAction.icon className="w-4 h-4" />
            <span>{content.secondaryAction.label}</span>
          </button>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 p-4 glass rounded-xl bg-mauve-500/10 border border-mauve-500/20"
        >
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              ¿Necesitas ayuda o tienes preguntas?
            </p>
            <div className="flex justify-center space-x-4 text-sm">
              <a 
                href="/docs" 
                className="text-mauve-400 hover:text-mauve-300 transition-colors"
              >
                Documentación
              </a>
              <span className="text-gray-500">•</span>
              <a 
                href="/contact" 
                className="text-mauve-400 hover:text-mauve-300 transition-colors"
              >
                Soporte
              </a>
            </div>
          </div>
        </motion.div>

        {/* Back to Onboarding Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => {
              reset()
              router.push('/onboarding')
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors underline"
          >
            Volver al inicio del registro
          </button>
        </motion.div>
      </GlassCard>
    </motion.div>
  )
}
