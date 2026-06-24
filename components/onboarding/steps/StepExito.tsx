'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  CheckCircle,
  Clock,
  ExternalLink,
  GraduationCap,
  Heart,
  Home,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { PsmSectionBlock } from '@/components/onboarding/psm/PsmSectionBlock'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { normalizeMotusName } from '@/lib/mns-utils'

interface StepExitoProps {
  onComplete?: () => void
}

function formatMotusDisplay(name?: string): string | null {
  if (!name?.trim()) return null
  const label = normalizeMotusName(name)
  return label ? `${label}.motus` : null
}

function celoscanAddressUrl(address: string): string {
  return `https://celoscan.io/address/${address}`
}

function celoscanTxUrl(txHash: string): string {
  return `https://celoscan.io/tx/${txHash}`
}

export function StepExito({ onComplete }: StepExitoProps) {
  const { role, reset, markCompleted, data } = useOnboardingStore()
  const router = useRouter()
  const hasMarkedCompleted = useRef(false)
  const hasCalledOnComplete = useRef(false)

  const motusDisplay = formatMotusDisplay(data.motusName)
  const walletAddress = data.smartWalletAddress || data.eoaAddress

  useEffect(() => {
    if (!hasMarkedCompleted.current) {
      markCompleted()
      hasMarkedCompleted.current = true
    }

    if (onComplete && !hasCalledOnComplete.current) {
      const timer = setTimeout(() => {
        onComplete()
        hasCalledOnComplete.current = true
      }, 100)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRedirect = (path: string) => {
    reset()
    router.push(path)
  }

  if (role === 'psm') {
    const nextSteps = [
      {
        icon: ShieldCheck,
        title: 'Revisión profesional',
        description: 'Validación de datos, documentos y alcance declarado.',
      },
      {
        icon: User,
        title: 'Perfil profesional',
        description: 'Tu perfil está creado, pero aún no será visible públicamente.',
      },
      {
        icon: GraduationCap,
        title: 'Formación y comunidad',
        description: 'Accede a recursos introductorios y espacios profesionales disponibles.',
      },
      {
        icon: Users,
        title: 'Supervisión',
        description:
          'Recibe orientación sobre criterios clínicos, límites de atención y uso ético.',
      },
      {
        icon: UserCheck,
        title: 'Recepción de usuarios',
        description: 'Se habilita únicamente después de aprobación administrativa.',
      },
    ] as const

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl mx-auto"
      >
        <GlassCard className="p-8 space-y-8">
          {motusDisplay && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-mauve-500/35 bg-gradient-to-br from-mauve-500/15 to-purple-500/10 p-4 md:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mauve-300">
                    Tu nombre Motus
                  </p>
                  <p className="text-2xl font-bold text-white">{motusDisplay}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ya puedes usar tu Motus Name Service (.motus) para pagos y transferencias internacionales, sin comisión e inmediatas, incluso mientras
                    tu perfil profesional está en revisión.
                  </p>
                </div>
                <Sparkles className="h-6 w-6 shrink-0 text-mauve-400" />
              </div>
              {data.mnsTxHash && (
                <a
                  href={celoscanTxUrl(data.mnsTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-mauve-300 hover:text-mauve-200"
                >
                  Ver registro MNS en Celoscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </motion.div>
          )}

          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </motion.div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold">🎉 Registro profesional recibido</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tu perfil profesional en MotusDAO fue creado correctamente y quedó en revisión
                administrativa.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Antes de activar el acceso completo, revisaremos tus credenciales, documentos,
                alcance profesional y disponibilidad.
              </p>
            </div>
          </div>

          <PsmSectionBlock title="Estado del registro">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200">
                <Clock className="h-3.5 w-3.5" />
                Pendiente de verificación
              </span>
            </div>

            {walletAddress && (
              <p className="text-sm text-muted-foreground">
                Registro on-chain:{' '}
                <a
                  href={celoscanAddressUrl(walletAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mauve-300 hover:text-mauve-200 underline underline-offset-2"
                >
                  ver tu wallet en Celoscan
                </a>
              </p>
            )}

            {data.profileNftTxHash && (
              <p className="text-xs text-muted-foreground">
                NFT de perfil:{' '}
                <a
                  href={celoscanTxUrl(data.profileNftTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mauve-300 hover:text-mauve-200 underline"
                >
                  ver transacción
                </a>
              </p>
            )}
          </PsmSectionBlock>

          <PsmSectionBlock title="Qué sigue ahora">
            <div className="grid gap-3">
              {nextSteps.map((step) => (
                <div
                  key={step.title}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mauve-500/20">
                    <step.icon className="h-4 w-4 text-mauve-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PsmSectionBlock>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <CTAButton
              onClick={() => handleRedirect('/')}
              className="flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Ir al inicio</span>
              <ArrowRight className="w-4 h-4" />
            </CTAButton>
            <button
              type="button"
              onClick={() => handleRedirect('/academia')}
              className="flex items-center justify-center gap-2 px-6 py-3 glass border border-white/10 rounded-xl hover:bg-white/15 transition-colors"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Formación y comunidad</span>
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-center text-xs text-muted-foreground">
            Te notificaremos cuando tu verificación profesional sea revisada. Mientras tanto, puedes
            explorar recursos de la plataforma.
          </div>
        </GlassCard>
      </motion.div>
    )
  }

  const usuarioContent = {
    title: '🎉 ¡Listo! Tu registro ha sido completado',
    subtitle: 'Bienvenido a MotusDAO. Tu cuenta de usuario está lista para usar.',
    features: [
      { icon: Heart, label: 'Acceso a psicoterapia', description: 'Conecta con profesionales' },
      { icon: Bot, label: 'MotusAI personalizado', description: 'Asistente de IA especializado' },
      { icon: GraduationCap, label: 'Cursos de bienestar', description: 'Recursos para tu salud mental' },
      { icon: Home, label: 'Bitácora privada', description: 'Diario personal seguro' },
    ],
    primaryAction: { label: 'Ir a MotusAI', path: '/motusai', icon: Bot },
    secondaryAction: { label: 'Ir a Inicio', path: '/', icon: Home },
  }

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
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
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
            {usuarioContent.title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-lg"
          >
            {usuarioContent.subtitle}
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
                    href={celoscanTxUrl(data.profileNftTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ver transacción en Celoscan
                  </a>
                </p>
              ) : (
                data.eoaAddress && (
                  <p>
                    Registro on-chain:{' '}
                    <a
                      href={celoscanAddressUrl(data.eoaAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      ver tu wallet en Celoscan
                    </a>
                  </p>
                )
              )}
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          {usuarioContent.features.map((feature, index) => (
            <motion.div
              key={feature.label}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <CTAButton
            onClick={() => handleRedirect(usuarioContent.primaryAction.path)}
            className="flex items-center space-x-2"
          >
            <usuarioContent.primaryAction.icon className="w-4 h-4" />
            <span>{usuarioContent.primaryAction.label}</span>
            <ArrowRight className="w-4 h-4" />
          </CTAButton>

          <button
            type="button"
            onClick={() => handleRedirect(usuarioContent.secondaryAction.path)}
            className="flex items-center justify-center space-x-2 px-6 py-3 glass border border-white/10 rounded-xl hover:bg-white/15 transition-colors"
          >
            <usuarioContent.secondaryAction.icon className="w-4 h-4" />
            <span>{usuarioContent.secondaryAction.label}</span>
          </button>
        </motion.div>
      </GlassCard>
    </motion.div>
  )
}
