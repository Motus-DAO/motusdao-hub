'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { authFetch } from '@/lib/auth/client'

type Slot = {
  id: string
  startsAt: string
  endsAt: string
  timezone: string | null
  isAvailable: boolean
  notes: string | null
}

type Props = {
  psmId: string
  psmName: string
  slug: string | null
}

const DEFAULT_TIMEZONE =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'America/Mexico_City'

function formatSlotRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const dateFmt = new Intl.DateTimeFormat('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const timeFmt = new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`
}

function durationMinutes(startsAt: string, endsAt: string) {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
}

export function AdminPsmAvailabilityPanel({ psmId, psmName, slug }: Props) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(50)

  const loadSlots = useCallback(async () => {
    const res = await authFetch(`/api/provider-availability?psmId=${encodeURIComponent(psmId)}`)
    const data = (await res.json()) as { slots?: Slot[]; error?: string }
    if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los horarios')
    const now = Date.now()
    setSlots(
      (data.slots ?? [])
        .filter((slot) => slot.isAvailable && new Date(slot.startsAt).getTime() > now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    )
  }, [psmId])

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        setError(null)
        await loadSlots()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar disponibilidad')
      } finally {
        setLoading(false)
      }
    })()
  }, [loadSlots])

  const addSlot = async () => {
    if (!date || !time) return
    setSaving(true)
    setError(null)
    try {
      const startsAt = new Date(`${date}T${time}:00`)
      if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
        throw new Error('Elige una fecha y hora futuras')
      }
      const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000)
      const res = await authFetch('/api/provider-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psmId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          timezone: DEFAULT_TIMEZONE,
          notes: 'admin-availability',
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el horario')
      await loadSlots()
      setDate('')
      setTime('10:00')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const seedDemoSlots = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch(`/api/admin/psm/${psmId}/availability/seed`, {
        method: 'POST',
      })
      const data = (await res.json()) as { error?: string; created?: number }
      if (!res.ok) throw new Error(data.error || 'No se pudieron generar horarios')
      await loadSlots()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar horarios')
    } finally {
      setSaving(false)
    }
  }

  const removeSlot = async (slotId: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch(`/api/provider-availability/${slotId}`, {
        method: 'DELETE',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar')
      await loadSlots()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <GlassCard className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando horarios...
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5 text-mauve-400" />
            Horarios de agenda
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Los pacientes ven estos bloques en el perfil público de {psmName}.
            {slug ? (
              <>
                {' '}
                <Link href={`/psicoterapia/${slug}`} className="text-mauve-400 underline">
                  Ver perfil
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void seedDemoSlots()}
          className="inline-flex items-center gap-2 rounded-lg border border-mauve-500/40 bg-mauve-500/10 px-3 py-1.5 text-sm hover:bg-mauve-500/20 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          Generar demo (7 días)
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-mauve-400" />
          <p className="text-sm font-medium">Agregar horario manual</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Fecha</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Hora inicio</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Duración (min)</span>
            <input
              type="number"
              min={30}
              max={120}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2"
            />
          </label>
        </div>
        <CTAButton className="mt-4" disabled={saving || !date} onClick={addSlot}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Publicar horario'
          )}
        </CTAButton>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay horarios futuros. Agrega uno manualmente o usa &quot;Generar demo&quot;.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"
            >
              <div className="flex items-start gap-2 text-sm">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-mauve-400" />
                <div>
                  <p className="font-medium">{formatSlotRange(slot.startsAt, slot.endsAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {durationMinutes(slot.startsAt, slot.endsAt)} min
                    {slot.timezone ? ` · ${slot.timezone}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void removeSlot(slot.id)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
