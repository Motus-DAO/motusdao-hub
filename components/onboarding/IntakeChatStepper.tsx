'use client'

import {
  computeFieldProgress,
  computeThreeQuestionStep,
} from '@/lib/intake-chat-progress'
import type { UserRole } from '@/lib/onboarding-store'

type Props = {
  role: UserRole
  phase?: string | null
  questionIndex?: number | null
  captured?: Record<string, unknown> | null
  intakeComplete?: boolean
  className?: string
}

export function IntakeChatStepper({
  role,
  phase,
  questionIndex,
  captured,
  intakeComplete = false,
  className = '',
}: Props) {
  const fp = computeFieldProgress(role, captured ?? undefined)
  const tq = computeThreeQuestionStep(role, phase ?? undefined, questionIndex)
  const pct = fp.total > 0 ? Math.round((fp.filledCount / fp.total) * 100) : 0
  const qBarPct = tq.handoffReady || intakeComplete ? 100 : Math.round((tq.displayStep / 3) * 100)

  return (
    <div
      className={`rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs space-y-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-foreground">
          Intake por chat ({role === 'usuario' ? 'paciente' : 'profesional'})
        </span>
        <span className="text-[10px] text-muted-foreground">
          {tq.handoffReady || intakeComplete ? (
            <span className="text-emerald-600 dark:text-emerald-300">3/3 · {tq.label}</span>
          ) : (
            <>
              P{tq.displayStep}/{tq.total}:{' '}
              <span className="text-mauve-700 dark:text-mauve-200">{tq.label}</span>
            </>
          )}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progreso de preguntas</span>
            <span>{tq.handoffReady || intakeComplete ? '100%' : `${qBarPct}%`}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-mauve-500 transition-all duration-300"
              style={{ width: `${qBarPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Campos del perfil</span>
            <span>
              {fp.filledCount}/{fp.total} ({pct}%)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-mauve-500 to-purple-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {!tq.handoffReady && !intakeComplete ? (
        <p className="text-[11px] text-amber-800 dark:text-amber-100/90 leading-relaxed">
          La IA hará{' '}
          <span className="font-medium text-foreground">tres preguntas</span> enfocadas y
          completará el resto del perfil. Puedes editar cualquier campo abajo.
        </p>
      ) : fp.nextFieldLabel ? (
        <p className="text-[11px] text-amber-800 dark:text-amber-100/90 leading-relaxed">
          Falta: <span className="font-medium text-foreground">{fp.nextFieldLabel}</span>{' '}
          — responde en el chat o complétalo en el formulario.
        </p>
      ) : (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-200/90 leading-relaxed">
          Perfil completo — puedes revisar y continuar.
        </p>
      )}
    </div>
  )
}
