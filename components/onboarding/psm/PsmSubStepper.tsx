'use client'

import { cn } from '@/lib/utils'
import { PSM_WIZARD_STEPS } from '@/lib/intake/psm-intake-options'

type Props = {
  currentStep: number
  onStepClick?: (step: number) => void
  className?: string
}

export function PsmSubStepper({ currentStep, onStepClick, className }: Props) {
  const interactive = Boolean(onStepClick)

  return (
    <nav aria-label="Pasos del registro profesional" className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Paso {currentStep + 1} de {PSM_WIZARD_STEPS.length}
        </span>
        <span>{PSM_WIZARD_STEPS[currentStep]?.title}</span>
      </div>
      <div className={cn('relative', interactive && 'group/bars')}>
        {interactive && (
          <p
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-0 right-0 mb-2 text-center text-xs text-muted-foreground/90 opacity-0 transition-opacity duration-200 group-hover/bars:opacity-100"
          >
            Haz clic en un paso de la barra para ir directamente
          </p>
        )}
        <ol className="flex gap-2 list-none p-0 m-0">
          {PSM_WIZARD_STEPS.map((step) => {
            const isCurrent = step.id === currentStep
            const isComplete = step.id < currentStep

            return (
              <li key={step.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.id)}
                  disabled={!interactive}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Paso ${step.id + 1}: ${step.title}`}
                  title={step.title}
                  className={cn(
                    'block w-full h-2 rounded-full transition-all',
                    isCurrent
                      ? 'bg-mauve-500 ring-2 ring-mauve-400/40 ring-offset-2 ring-offset-transparent'
                      : isComplete
                        ? 'bg-mauve-500/70'
                        : 'bg-foreground/10',
                    interactive &&
                      'cursor-pointer hover:scale-y-125 hover:bg-mauve-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-default'
                  )}
                />
              </li>
            )
          })}
        </ol>
      </div>
      <p className="text-sm text-muted-foreground">{PSM_WIZARD_STEPS[currentStep]?.description}</p>
    </nav>
  )
}
