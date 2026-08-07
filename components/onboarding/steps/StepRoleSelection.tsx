'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Heart,
  ArrowRight,
  Shield,
  Users,
  Brain,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { onboardingBackButtonClass } from '@/lib/onboarding-ui'

interface StepRoleSelectionProps {
  onNext: () => void
  onBack: () => void
}

type RoleChoice = 'usuario' | 'psm'

export function StepRoleSelection({ onNext, onBack }: StepRoleSelectionProps) {
  const { role, setRole, setUsuarioIntakeTrack } = useOnboardingStore()

  const initialChoice: RoleChoice | null =
    role === 'psm' ? 'psm' : role === 'usuario' ? 'usuario' : null

  const [selectedChoice, setSelectedChoice] = useState<RoleChoice | null>(initialChoice)

  const handleChoiceSelect = (choice: RoleChoice) => {
    setSelectedChoice(choice)

    if (choice === 'psm') {
      setRole('psm')
      return
    }

    setRole('usuario')
    // Users go through the therapy matching intake (video-only sessions).
    setUsuarioIntakeTrack('therapy')
  }

  const handleContinue = () => {
    if (selectedChoice) onNext()
  }

  const cardClass = (choice: RoleChoice) =>
    `p-6 transition-all duration-300 relative ${
      selectedChoice === choice
        ? 'ring-4 ring-mauve-500 bg-mauve-500/15 border-2 border-mauve-500 shadow-lg shadow-mauve-500/20'
        : 'hover:bg-foreground/5 border border-border'
    }`

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="mx-auto w-full max-w-4xl"
    >
      <GlassCard className="p-8">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-foreground">Selecciona tu tipo de cuenta</h2>
          <p className="text-muted-foreground">Elige cómo quieres usar MotusDAO</p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative cursor-pointer"
            onClick={() => handleChoiceSelect('usuario')}
          >
            <GlassCard className={cardClass('usuario')}>
              {selectedChoice === 'usuario' && (
                <div className="absolute right-4 top-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mauve-500 shadow-lg">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
              <div className="mb-4 flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Soy Usuario</h3>
                  <p className="text-sm text-muted-foreground">Busco apoyo en salud mental</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-400" />
                  <span>Acceso a psicoterapia por video</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-400" />
                  <span>MotusAI con VeniceAI (privacidad)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span>Motus Names, Hub y bitácora</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative cursor-pointer"
            onClick={() => handleChoiceSelect('psm')}
          >
            <GlassCard className={cardClass('psm')}>
              {selectedChoice === 'psm' && (
                <div className="absolute right-4 top-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mauve-500 shadow-lg">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
              <div className="mb-4 flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Soy Profesional (PSM)</h3>
                  <p className="text-sm text-muted-foreground">Profesional de la Salud Mental</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <span>Gestión de pacientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span>Supervisión de casos</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-400" />
                  <span>Certificaciones</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <div className="flex justify-between pt-6">
          <button type="button" onClick={onBack} className={onboardingBackButtonClass}>
            Atrás
          </button>

          <CTAButton
            onClick={handleContinue}
            disabled={!selectedChoice}
            className="flex items-center space-x-2"
          >
            <span>Continuar</span>
            <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </GlassCard>
    </motion.div>
  )
}
