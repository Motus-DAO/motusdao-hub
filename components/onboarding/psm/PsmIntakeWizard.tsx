'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { computePsmIntakeProgress, getPsmIntakeBlockers, isPsmIntakeComplete } from '@/lib/intake/psm-intake-v1'
import { PsmSubStepper } from './PsmSubStepper'
import { PsmIdentityStep } from './steps/PsmIdentityStep'
import { PsmPracticeStep } from './steps/PsmPracticeStep'
import { PsmOperationsStep } from './steps/PsmOperationsStep'
import { PsmDocumentsStep } from './steps/PsmDocumentsStep'
import { PsmMediaStep } from './steps/PsmMediaStep'
import { StepAIIntake } from '../steps/StepAIIntake'
import { PsmStepValidationBanner } from './PsmStepValidationBanner'

interface PsmIntakeWizardProps {
  onNext: () => void
  onBack: () => void
}

export function PsmIntakeWizard({ onNext, onBack }: PsmIntakeWizardProps) {
  const { data, profileIntakeMode, setProfileIntakeMode, psmWizardStep, setPsmWizardStep } =
    useOnboardingStore()
  const intakeMode = profileIntakeMode ?? 'manual'
  const wizardStep = psmWizardStep
  const setWizardStep = setPsmWizardStep
  const [exitBlockers, setExitBlockers] = useState(false)

  const progress = computePsmIntakeProgress(data)

  const handleWizardComplete = () => {
    if (!isPsmIntakeComplete(data)) {
      setExitBlockers(true)
      return
    }
    setExitBlockers(false)
    onNext()
  }

  const goToDocumentsFromChat = () => {
    setProfileIntakeMode('manual')
    setWizardStep(4)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Registro profesional</h2>
          <p className="text-muted-foreground">
            Formulario de registro para profesionales de la salud mental
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Progreso del formulario: {progress.percent}% ({progress.filledCount}/{progress.total})
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 p-1">
          <button
            type="button"
            onClick={() => setProfileIntakeMode('manual')}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              intakeMode === 'manual' ? 'bg-mauve-500 text-white' : 'text-muted-foreground hover:text-white'
            }`}
          >
            Completar registro
          </button>
          <button
            type="button"
            onClick={() => setProfileIntakeMode('ai')}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              intakeMode === 'ai' ? 'bg-mauve-500 text-white' : 'text-muted-foreground hover:text-white'
            }`}
          >
            Guiarme con conversación
          </button>
        </div>

        {intakeMode === 'ai' ? (
          <StepAIIntake role="psm" onNext={goToDocumentsFromChat} />
        ) : (
          <>
            {exitBlockers && (
              <div className="mb-6">
                <PsmStepValidationBanner
                  title="Tu registro profesional aún no está completo:"
                  blockers={getPsmIntakeBlockers(data)}
                />
              </div>
            )}
            <PsmSubStepper
              currentStep={wizardStep}
              onStepClick={setWizardStep}
              className="mb-6"
            />
            {wizardStep === 0 && (
              <PsmIdentityStep onContinue={() => setWizardStep(1)} />
            )}
            {wizardStep === 1 && (
              <PsmPracticeStep
                onBack={() => setWizardStep(0)}
                onContinue={() => setWizardStep(2)}
              />
            )}
            {wizardStep === 2 && (
              <PsmMediaStep
                onBack={() => setWizardStep(1)}
                onContinue={() => setWizardStep(3)}
              />
            )}
            {wizardStep === 3 && (
              <PsmOperationsStep
                onBack={() => setWizardStep(2)}
                onContinue={() => setWizardStep(4)}
              />
            )}
            {wizardStep === 4 && (
              <PsmDocumentsStep
                onBack={() => setWizardStep(3)}
                onContinue={handleWizardComplete}
              />
            )}
          </>
        )}

        <div className="flex justify-start pt-6 mt-6 border-t border-white/10">
          {(intakeMode === 'ai' || wizardStep === 0) && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Atrás
            </button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}
