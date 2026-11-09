'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Landmark, ShieldCheck, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'

type Props = {
  open: boolean
  onClose: () => void
}

const STEPS = [
  {
    title: 'Elige un profesional',
    detail: 'Uno que acepte SPEI como forma de pago.',
  },
  {
    title: 'Reserva tu sesión',
    detail: 'Elige fecha y hora; la sesión queda agendada.',
  },
  {
    title: 'Recibe su CLABE',
    detail: 'En la página de pago verás CLABE, monto y referencia.',
  },
  {
    title: 'Transfiere desde tu banco',
    detail: 'Haz la transferencia y registra el comprobante en la app.',
  },
  {
    title: 'El profesional confirma',
    detail: 'Cuando valida la transferencia, la sesión queda pagada.',
  },
]

export function SpeiPaymentModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spei-modal-title"
        className="w-full max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <GlassCard className="max-h-[90vh] overflow-y-auto p-0">
          <div className="relative bg-gradient-to-br from-mauve-500/25 via-fuchsia-500/10 to-amber-500/10 p-6">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/30 ring-1 ring-white/15">
                <Image src="/logo.svg" width={34} height={34} alt="MotusDAO" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-mauve-200">
                  MotusDAO
                </p>
                <h2 id="spei-modal-title" className="text-2xl font-bold">
                  Pagar con SPEI
                </h2>
                <p className="text-sm text-muted-foreground">
                  Transferencia bancaria, sin tarjeta.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-muted-foreground">
              SPEI es una transferencia desde tu banco al CLABE del profesional.
              La app te guía; el dinero no se cobra aquí.
            </p>

            <ol className="mt-5 space-y-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mauve-500/15 text-xs font-semibold text-mauve-200">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-5 rounded-xl border border-mauve-500/25 bg-mauve-500/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-mauve-300" />
                Paga seguro en Motus
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Paga solo la sesión que ves aquí.</li>
                <li>
                  Usa la CLABE de esta pantalla; no la que te manden por WhatsApp.
                </li>
                <li>Verifica que el nombre del beneficiario coincida.</li>
                <li>Sube el comprobante en Motus; el profesional confirma.</li>
                <li>Si te piden pagar por fuera, repórtalo.</li>
              </ul>
              <Link
                href="/politicas-de-pago"
                onClick={onClose}
                className="mt-2 inline-flex text-xs font-semibold text-mauve-300 underline"
              >
                Política de pagos
              </Link>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-amber-200">Importante:</span>{' '}
                la CLABE es del profesional. Verifica el monto y la referencia
                antes de transferir; no compartas comprobantes fuera de la app.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <CTAButton asChild className="flex-1 gap-2">
                <Link href="/psicoterapia" onClick={onClose}>
                  Elegir profesional
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CTAButton>
              <CTAButton variant="ghost" onClick={onClose} className="sm:w-auto">
                Cerrar
              </CTAButton>
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
              El profesional confirma la transferencia antes de la sesión.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>,
    document.body
  )
}
