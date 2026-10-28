'use client'

import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { authFetch } from '@/lib/auth/client'
import { clinicalSummaryNotExpediente } from '@/lib/clinical-summary/constants'

type Props = {
  patientUserId: string
  patientName: string
}

type Summary = {
  id: string
  title: string | null
  summaryText: string
  createdAt: string
}

export function PatientSharedSummariesPanel({ patientUserId, patientName }: Props) {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void authFetch(`/api/clinical-summary/patient/${patientUserId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { summaries?: Summary[] } | null) => {
        setSummaries(d?.summaries ?? [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [patientUserId])

  if (!loaded) return null
  if (summaries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground mt-3 border-t border-white/10 pt-3">
        {patientName} aún no ha compartido un resumen consentido contigo.
      </p>
    )
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
      <p className="text-xs font-medium text-foreground">Resúmenes compartidos por la persona</p>
      <p className="text-[11px] text-muted-foreground">{clinicalSummaryNotExpediente}</p>
      {summaries.map((s) => (
        <GlassCard key={s.id} className="p-3 text-xs space-y-1">
          {s.title && <p className="font-medium">{s.title}</p>}
          <p className="text-muted-foreground whitespace-pre-wrap">{s.summaryText}</p>
          <p className="text-[10px] opacity-70">{new Date(s.createdAt).toLocaleString()}</p>
        </GlassCard>
      ))}
    </div>
  )
}
