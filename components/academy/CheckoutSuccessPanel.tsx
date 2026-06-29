'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'

type CheckoutPhase = 'activating' | 'ready' | 'error'

export function CheckoutSuccessPanel({
  phase,
  errorMessage,
}: {
  phase: CheckoutPhase
  errorMessage?: string | null
}) {
  const steps = [
    { id: 'paid', label: 'Pago recibido', done: true },
    {
      id: 'access',
      label: 'Activando acceso',
      done: phase === 'ready',
      active: phase === 'activating',
    },
    {
      id: 'course',
      label: 'Abrir curso',
      done: phase === 'ready',
      active: phase === 'ready',
    },
  ] as const

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="rounded-xl border border-green-400/30 bg-green-500/10 p-4"
      >
        <div className="mb-3 flex items-center gap-2 text-green-300">
          <motion.div
            initial={{ scale: 0.85 }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle2 className="h-5 w-5" />
          </motion.div>
          <span className="text-sm font-semibold">
            {phase === 'ready' ? '¡Acceso activado!' : '¡Pago recibido!'}
          </span>
        </div>

        <p className="text-xs text-green-200/90">
          {phase === 'ready'
            ? 'Todo listo. Te llevamos al contenido del curso.'
            : phase === 'error'
              ? errorMessage || 'Tu pago fue recibido. Recarga la página en unos segundos.'
              : 'Estamos activando tu acceso. Esto suele tardar solo unos segundos.'}
        </p>

        <ol className="mt-4 space-y-2">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-xs">
              {step.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
              ) : step.active ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-green-300" />
              ) : (
                <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-white/20" />
              )}
              <span
                className={
                  step.done
                    ? 'text-green-200'
                    : step.active
                      ? 'text-white'
                      : 'text-muted-foreground'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </motion.div>

      {phase === 'activating' && (
        <CTAButton size="lg" className="w-full gap-2" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
          Activando acceso...
        </CTAButton>
      )}

      {phase === 'ready' && (
        <CTAButton size="lg" className="w-full gap-2" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
          Abriendo curso...
        </CTAButton>
      )}

      {phase === 'error' && errorMessage && (
        <p className="text-center text-xs text-red-300">{errorMessage}</p>
      )}
    </div>
  )
}
