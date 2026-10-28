'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { authFetch } from '@/lib/auth/client'
import {
  TRAINING_COMPENSATION_USD_OPTIONS,
  TRAINING_COPY_MAX_CHARS,
  TRAINING_COPY_MIN_CHARS,
  trainingCopyNotice,
  trainingCopySubmitLead,
} from '@/lib/training-copy/constants'
import { ArrowLeft, Trash2 } from 'lucide-react'

type ContributionRow = {
  id: string
  title: string | null
  copyText: string
  compensationUsd: number
  payoutStatus: string
  createdAt: string
}

export default function ContribuirEntrenamientoPage() {
  const { isSessionReady } = useSiweSession()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [compensationUsd, setCompensationUsd] = useState<number>(0)
  const [checks, setChecks] = useState({
    voluntary: false,
    cannotUntrain: false,
    reidentification: false,
    notExpediente: false,
    authored: false,
  })
  const [canContribute, setCanContribute] = useState(false)
  const [consentOn, setConsentOn] = useState(false)
  const [rows, setRows] = useState<ContributionRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    if (!isSessionReady) return
    void authFetch('/api/training-copy')
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            contributions?: ContributionRow[]
            canContribute?: boolean
            consentToTrainingCopy?: boolean
          } | null
        ) => {
          if (!d) return
          setRows(d.contributions ?? [])
          setCanContribute(Boolean(d.canContribute))
          setConsentOn(Boolean(d.consentToTrainingCopy))
        }
      )
      .catch(() => undefined)
  }, [isSessionReady])

  useEffect(() => {
    load()
  }, [load])

  const allChecked =
    checks.voluntary &&
    checks.cannotUntrain &&
    checks.reidentification &&
    checks.notExpediente &&
    checks.authored

  const handleSubmit = async () => {
    setError(null)
    setSaving(true)
    try {
      const res = await authFetch('/api/training-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          copyText: text,
          compensationUsd,
          confirmVoluntary: checks.voluntary,
          confirmCannotUntrain: checks.cannotUntrain,
          confirmReidentification: checks.reidentification,
          confirmNotExpediente: checks.notExpediente,
          confirmAuthoredForTraining: checks.authored,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar')
      setText('')
      setTitle('')
      setChecks({
        voluntary: false,
        cannotUntrain: false,
        reidentification: false,
        notExpediente: false,
        authored: false,
      })
      setConsentOn(true)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar')
    } finally {
      setSaving(false)
    }
  }

  const revokeConsent = async () => {
    if (!window.confirm('¿Revocar consentimiento y cancelar copias activas de entrenamiento?')) return
    await authFetch('/api/consent/training-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    })
    setConsentOn(false)
    load()
  }

  const revokeRow = async (id: string) => {
    if (!window.confirm('¿Revocar esta copia para usos futuros de entrenamiento?')) return
    await authFetch(`/api/training-copy/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <Section className="py-10">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        <Link href="/psychat/archivo" className="inline-flex items-center gap-1 text-sm text-mauve-400 underline">
          <ArrowLeft className="h-4 w-4" />
          Volver a guía Psychat
        </Link>

        <GradientText as="h1" className="text-3xl font-semibold">
          Copia legible para entrenamiento
        </GradientText>
        <p className="text-sm text-muted-foreground">
          Tercer consentimiento, distinto de Psychat, bitácora cifrada o resumen para tu profesional.{' '}
          {trainingCopyNotice.careUnchanged}
        </p>

        <SiweSessionBanner />

        {!isSessionReady ? null : !canContribute ? (
          <GlassCard className="p-6 text-sm text-muted-foreground">
            Necesitas haber aceptado el aviso de privacidad en tu registro antes de usar esta salida.
          </GlassCard>
        ) : (
          <>
            <GlassCard className="p-6 space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Aviso (léelo antes de enviar)</p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-foreground">Texto:</strong> lo escribes tú en claro; no desciframos
                  bitácora ni archivo Psychat por ti.
                </li>
                <li>
                  <strong className="text-foreground">Procesador:</strong> {trainingCopyNotice.processor}
                </li>
                <li>
                  <strong className="text-foreground">Finalidad:</strong> {trainingCopyNotice.purpose}
                </li>
                <li>
                  <strong className="text-foreground">Conservación:</strong> {trainingCopyNotice.retention}
                </li>
                <li>{trainingCopyNotice.cannotUntrain}</li>
                <li>{trainingCopyNotice.reidentification}</li>
              </ul>
            </GlassCard>

            <GlassCard className="p-6 space-y-4">
              <label className="block text-sm">
                <span className="text-muted-foreground">Título opcional</span>
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Tu copia en claro</span>
                <textarea
                  className="mt-1 min-h-[160px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={TRAINING_COPY_MAX_CHARS}
                  placeholder={trainingCopySubmitLead}
                />
                <span className="text-xs text-muted-foreground">
                  {text.trim().length} / mínimo {TRAINING_COPY_MIN_CHARS}
                </span>
              </label>

              <fieldset className="space-y-2 text-sm">
                <legend className="font-medium text-foreground">Compensación registrada (USD)</legend>
                <p className="text-xs text-muted-foreground">
                  No es pago instantáneo: queda registrado para liquidación manual cuando el programa esté activo.
                  0 USD = aporte voluntario.
                </p>
                <div className="flex flex-wrap gap-3">
                  {TRAINING_COMPENSATION_USD_OPTIONS.map((amount) => (
                    <label key={amount} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="compensation"
                        checked={compensationUsd === amount}
                        onChange={() => setCompensationUsd(amount)}
                      />
                      {amount === 0 ? 'Voluntario (0)' : `${amount} USD`}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2 text-sm">
                {(
                  [
                    ['voluntary', 'Es voluntario; entiendo que la atención en Motus no depende de esto.'],
                    ['cannotUntrain', trainingCopyNotice.cannotUntrain],
                    ['reidentification', trainingCopyNotice.reidentification],
                    ['notExpediente', 'No es expediente clínico ni nota de sesión con mi profesional.'],
                    ['authored', trainingCopySubmitLead],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checks[key]}
                      onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <CTAButton
                disabled={saving || !allChecked || text.trim().length < TRAINING_COPY_MIN_CHARS}
                onClick={() => void handleSubmit()}
              >
                {saving ? 'Enviando…' : 'Enviar copia para entrenamiento'}
              </CTAButton>

              {consentOn ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => void revokeConsent()}
                >
                  Revocar consentimiento de entrenamiento
                </button>
              ) : null}
            </GlassCard>

            {rows.length > 0 ? (
              <GlassCard className="p-6 space-y-4">
                <p className="font-medium text-foreground">Copias activas</p>
                {rows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-white/10 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {row.title ? <p className="font-medium">{row.title}</p> : null}
                        <p className="text-xs text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()} · {row.compensationUsd} USD ·{' '}
                          {row.payoutStatus}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Revocar"
                        className="text-muted-foreground hover:text-red-400"
                        onClick={() => void revokeRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 line-clamp-3 text-muted-foreground">{row.copyText}</p>
                  </div>
                ))}
              </GlassCard>
            ) : null}
          </>
        )}
      </div>
    </Section>
  )
}
