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
      className={`rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs space-y-2 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-white/90">
          Intake por chat ({role === 'usuario' ? 'paciente' : 'profesional'})
        </span>
        <span className="text-[10px] text-white/50">
          {tq.handoffReady || intakeComplete ? (
            <span className="text-emerald-300">3/3 · {tq.label}</span>
          ) : (
            <>
              P{tq.displayStep}/{tq.total}:{' '}
              <span className="text-mauve-200">{tq.label}</span>
            </>
          )}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-white/45 mb-1">
          <span>Progreso de preguntas</span>
          <span>{tq.handoffReady || intakeComplete ? '100%' : `${qBarPct}%`}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-mauve-500 transition-all duration-300"
            style={{ width: `${qBarPct}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-white/45 mb-1">
          <span>Campos del perfil</span>
          <span>
            {fp.filledCount}/{fp.total} ({pct}%)
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-mauve-500 to-purple-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {!tq.handoffReady && !intakeComplete ? (
        <p className="text-[11px] text-amber-100/90">
          La IA hará{' '}
          <span className="font-medium text-white">tres preguntas</span> enfocadas y
          completará el resto del perfil. Puedes editar cualquier campo abajo.
        </p>
      ) : fp.nextFieldLabel ? (
        <p className="text-[11px] text-amber-100/90">
          Falta: <span className="font-medium text-white">{fp.nextFieldLabel}</span>{' '}
          — responde en el chat o complétalo en el formulario.
        </p>
      ) : (
        <p className="text-[11px] text-emerald-200/90">
          Perfil completo — puedes revisar y continuar.
        </p>
      )}
    </div>
  )
}
