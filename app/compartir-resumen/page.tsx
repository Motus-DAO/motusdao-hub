'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { authFetch } from '@/lib/auth/client'
import {
  CLINICAL_SUMMARY_MAX_CHARS,
  clinicalSummaryNotExpediente,
  clinicalSummaryShareCopy,
} from '@/lib/clinical-summary/constants'
import { ArrowLeft, Download, Trash2 } from 'lucide-react'

type SummaryRow = {
  id: string
  title: string | null
  summaryText: string
  createdAt: string
  fhirDocumentReference: unknown
}

export default function CompartirResumenPage() {
  const { isSessionReady, sessionState } = useSiweSession()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [confirmedNotExpediente, setConfirmedNotExpediente] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [hasMatch, setHasMatch] = useState(false)
  const [summaries, setSummaries] = useState<SummaryRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!isSessionReady) return
    void authFetch('/api/clinical-summary')
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            summaries?: SummaryRow[]
            canShare?: boolean
            activeMatch?: { id: string } | null
          } | null
        ) => {
          if (!d) return
          setSummaries(d.summaries ?? [])
          setCanShare(Boolean(d.canShare))
          setHasMatch(Boolean(d.activeMatch))
        }
      )
      .catch(() => undefined)
  }

  useEffect(() => {
    load()
  }, [isSessionReady])

  const handleSubmit = async () => {
    setError(null)
    setSaving(true)
    try {
      const res = await authFetch('/api/clinical-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          summaryText: text,
          confirmNotExpediente: confirmedNotExpediente,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo compartir')
      setText('')
      setTitle('')
      setConfirmedNotExpediente(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al compartir')
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm('¿Dejar de compartir este resumen con tu profesional?')) return
    await authFetch(`/api/clinical-summary/${id}`, { method: 'DELETE' })
    load()
  }

  const downloadFhir = (row: SummaryRow) => {
    const blob = new Blob([JSON.stringify(row.fhirDocumentReference, null, 2)], {
      type: 'application/fhir+json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `motus-resumen-fhir-${row.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto max-w-2xl px-6 py-12 space-y-8">
          <Link
            href="/perfil"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a perfil
          </Link>

          <GradientText as="h1" className="text-3xl font-bold">
            Compartir resumen con tu profesional
          </GradientText>

          <p className="text-sm text-muted-foreground">{clinicalSummaryShareCopy}</p>
          <p className="text-sm text-amber-200/90 border border-amber-400/30 rounded-lg px-3 py-2">
            {clinicalSummaryNotExpediente}
          </p>

          {sessionState === 'needs_signature' && <SiweSessionBanner compact />}

          {isSessionReady && !canShare && (
            <GlassCard className="p-4 text-sm text-muted-foreground">
              Necesitas haber aceptado compartir datos con un profesional en tu registro. Revisa tu
              onboarding o contacto con soporte.
            </GlassCard>
          )}

          {isSessionReady && canShare && !hasMatch && (
            <GlassCard className="p-4 text-sm text-muted-foreground">
              Aún no tienes un emparejamiento activo con un psicólogo/a en el Hub.
            </GlassCard>
          )}

          {isSessionReady && canShare && hasMatch && (
            <GlassCard className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Título opcional (ej. Semana del 28 oct)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="w-full min-h-[160px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Escribe el resumen que quieres que lea tu profesional…"
                maxLength={CLINICAL_SUMMARY_MAX_CHARS}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmedNotExpediente}
                  onChange={(e) => setConfirmedNotExpediente(e.target.checked)}
                />
                Entiendo que esto no sustituye una nota clínica ni comparte mi bitácora o Psychat
                completos.
              </label>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <CTAButton
                disabled={saving || !confirmedNotExpediente || text.trim().length < 20}
                onClick={() => void handleSubmit()}
              >
                {saving ? 'Compartiendo…' : 'Compartir con mi profesional'}
              </CTAButton>
            </GlassCard>
          )}

          {summaries.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Resúmenes activos</h2>
              {summaries.map((row) => (
                <GlassCard key={row.id} className="p-4 space-y-2 text-sm">
                  {row.title && <p className="font-medium">{row.title}</p>}
                  <p className="text-muted-foreground whitespace-pre-wrap">{row.summaryText}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <CTAButton type="button" size="sm" variant="secondary" onClick={() => downloadFhir(row)}>
                      <Download className="w-3 h-3 mr-1 inline" />
                      Export FHIR
                    </CTAButton>
                    <CTAButton type="button" size="sm" variant="ghost" onClick={() => void revoke(row.id)}>
                      <Trash2 className="w-3 h-3 mr-1 inline" />
                      Dejar de compartir
                    </CTAButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <Link href="/psychat/archivo" className="text-sm text-mauve-400 underline block">
            ¿Copia cifrada de Psychat o privacidad TEE/E2EE? Ver guía en Psychat → archivo
          </Link>
        </div>
      </Section>
    </div>
  )
}
