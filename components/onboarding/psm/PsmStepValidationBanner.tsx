'use client'

import { AlertCircle } from 'lucide-react'
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
    <div
      role="alert"
      className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-50"
    >
      <div className="flex items-start gap-2 font-medium mb-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-300" />
        <span>{title}</span>
      </div>
      <ul className="space-y-2 pl-6 list-disc marker:text-amber-600 dark:marker:text-amber-300/80">
        {blockers.map((blocker) => (
          <li key={blocker.key}>
            <span className="font-medium text-amber-950 dark:text-white/90">{blocker.label}</span>
            <span className="text-amber-800 dark:text-amber-100/85"> — {blocker.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
