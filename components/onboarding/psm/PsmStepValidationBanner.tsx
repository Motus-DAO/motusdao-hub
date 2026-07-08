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
      <ul className="mt-2 list-disc space-y-2 pl-6 marker:opacity-70">
        {blockers.map((blocker) => (
          <li key={blocker.key}>
            <span className="font-medium">{blocker.label}</span>
            <span className="opacity-90"> — {blocker.hint}</span>
          </li>
        ))}
      </ul>
    </StatusBanner>
  )
}
