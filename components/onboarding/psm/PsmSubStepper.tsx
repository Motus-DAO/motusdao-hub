'use client'

import { cn } from '@/lib/utils'
import { PSM_WIZARD_STEPS } from '@/lib/intake/psm-intake-options'

type Props = {
  currentStep: number
  className?: string
}

export function PsmSubStepper({ currentStep, className }: Props) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Paso {currentStep + 1} de {PSM_WIZARD_STEPS.length}
        </span>
        <span>{PSM_WIZARD_STEPS[currentStep]?.title}</span>
      </div>
      <div className="flex gap-2">
        {PSM_WIZARD_STEPS.map((step) => (
          <div
            key={step.id}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              step.id <= currentStep ? 'bg-mauve-500' : 'bg-white/10'
            )}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{PSM_WIZARD_STEPS[currentStep]?.description}</p>
    </div>
  )
}
