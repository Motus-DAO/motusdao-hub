'use client'

import { StatusBanner } from '@/components/ui/StatusBanner'
import type { PsmWizardBlocker } from '@/lib/intake/psm-intake-v1'

type Props = {
  title?: string
  blockers: PsmWizardBlocker[]
}

export function PsmStepValidationBanner({
  title = 'Antes de continuar, completa lo siguiente:',
  blockers,
}: Props) {
  if (blockers.length === 0) return null

  return (
    <StatusBanner variant="warning" role="alert" title={title}>
      <ul className="mt-2 space-y-2 pl-6 list-disc marker:text-amber-600 dark:marker:text-amber-300/80">
        {blockers.map((blocker) => (
          <li key={blocker.key}>
            <span className="font-medium text-amber-950 dark:text-amber-50">{blocker.label}</span>
            <span className="text-amber-800 dark:text-amber-100/85"> — {blocker.hint}</span>
          </li>
        ))}
      </ul>
    </StatusBanner>
  )
}
