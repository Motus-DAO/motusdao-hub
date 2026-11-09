'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'

type EscrowSession = {
  id: string
  amount: string
  startsAt: number
  settledAt: number
  challengeWindow: number
  status: number
  patient: string
  payee: string
}

const STATUS_LABEL: Record<number, string> = {
  0: 'Sin crear',
  1: 'Esperando depósito',
  2: 'Depositada',
  3: 'Confirmada',
  4: 'En disputa',
  5: 'Liquidada',
  6: 'Reembolsada',
}

const STATUS_CLASS: Record<number, string> = {
  0: 'bg-slate-500/10 text-slate-300',
  1: 'bg-yellow-500/10 text-yellow-300',
  2: 'bg-mauve-500/10 text-mauve-200',
  3: 'bg-blue-500/10 text-blue-300',
  4: 'bg-red-500/10 text-red-300',
  5: 'bg-green-500/10 text-green-300',
  6: 'bg-slate-500/10 text-slate-300',
}

function short(value: string) {
  return value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`
}

function formatDate(seconds: number) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(seconds * 1000))
}

export default function SesionesPage() {
  const [sessions, setSessions] = useState<EscrowSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const response = await fetch('/api/psm/escrow-sessions')
      const body = (await response.json().catch(() => ({}))) as {
        sessions?: EscrowSession[]
        error?: string
      }
      if (!response.ok) throw new Error(body.error || 'No se pudieron cargar las sesiones.')
      setSessions(body.sessions || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(true)

    const onFocus = () => void load()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(() => void load(), 20_000)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [load])

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/cobros"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Cobros
        </Link>

        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Sesiones</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sesiones pagadas por tus pacientes. Ábrelas para confirmar la sesión y
              liberar el pago.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-mauve-500" />
          </div>
        ) : error ? (
          <GlassCard className="p-6 text-sm text-red-300">{error}</GlassCard>
        ) : sessions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no tienes sesiones pagadas en el escrow.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <GlassCard key={session.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {formatUnits(BigInt(session.amount), 18)} wMXN
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paciente {short(session.patient)} · Inicio{' '}
                      {formatDate(session.startsAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      STATUS_CLASS[session.status] ?? ''
                    }`}
                  >
                    {STATUS_LABEL[session.status] ?? session.status}
                  </span>
                </div>
                <div className="mt-4 flex justify-end">
                  <CTAButton
                    asChild
                    size="sm"
                    variant={
                      session.status === 2 || session.status === 3
                        ? 'primary'
                        : 'secondary'
                    }
                  >
                    <Link href={`/pagar/${session.id}`}>
                      {session.status === 2
                        ? 'Ver y confirmar'
                        : session.status === 3
                          ? 'Liberar ahora'
                          : 'Ver detalle'}
                    </Link>
                  </CTAButton>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
