'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, Loader2, Plus, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { authFetch, fetchAppSession } from '@/lib/auth/client'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { WeeklyAvailabilityCalendar } from './WeeklyAvailabilityCalendar'

type Slot = {
  id: string
  startsAt: string
  endsAt: string
  timezone: string | null
  isAvailable: boolean
  notes: string | null
}

const DEFAULT_TIMEZONE =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'America/Mexico_City'

const DAY_MS = 24 * 60 * 60 * 1000

function dayLabel(startsAt: string) {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(startsAt))
}

function hourLabel(startsAt: string) {
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(startsAt))
}

export function AvailabilityManager() {
  const { isSessionReady } = useSiweSession()
  const [psmId, setPsmId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(50)
  const [horizonDays, setHorizonDays] = useState(7)

  /**
   * Calendly-style: group published slots per day and only render a rolling
   * window, so 8 weeks of availability is not 800 rows in one scroll.
   */
  const days = useMemo(() => {
    const limit = Date.now() + horizonDays * DAY_MS
    const grouped = new Map<string, { key: string; label: string; slots: Slot[] }>()

    for (const slot of slots) {
      const startsAt = new Date(slot.startsAt)
      if (startsAt.getTime() > limit) continue
      const key = slot.startsAt.slice(0, 10)
      const entry = grouped.get(key) ?? {
        key,
        label: dayLabel(slot.startsAt),
        slots: [],
      }
      entry.slots.push(slot)
      grouped.set(key, entry)
    }

    return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [slots, horizonDays])

  const shown = days.reduce((total, day) => total + day.slots.length, 0)

  const loadSession = useCallback(async () => {
    const session = await fetchAppSession()
    setPsmId(session.authenticated ? session.userId : null)
    setRole(session.role)
    return session
  }, [])

  const loadSlots = useCallback(async (id: string) => {
    const res = await authFetch(`/api/provider-availability?psmId=${encodeURIComponent(id)}`)
    const data = (await res.json()) as { slots?: Slot[]; error?: string }
    if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los horarios')
    const now = Date.now()
    setSlots(
      (data.slots ?? [])
        .filter((slot) => slot.isAvailable && new Date(slot.startsAt).getTime() > now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    )
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        setError(null)
        const session = await loadSession()
        if (!session.authenticated || session.role !== 'psm' || !session.userId) {
          setSlots([])
          return
        }
        if (!isSessionReady) return
        await loadSlots(session.userId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar disponibilidad')
      } finally {
        setLoading(false)
      }
    })()
  }, [isSessionReady, loadSession, loadSlots])

  const addSlot = async () => {
    if (!psmId || !date || !time) return
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
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el horario')
      await loadSlots(psmId)
      setDate('')
      setTime('10:00')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const removeSlot = async (slotId: string) => {
    if (!psmId) return
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch(`/api/provider-availability/${slotId}`, {
        method: 'DELETE',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar')
      await loadSlots(psmId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando disponibilidad...
      </div>
    )
  }

  if (role !== 'psm') {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-muted-foreground">
          Esta sección es solo para profesionales (PSM). Si eres paciente, agenda desde{' '}
          <Link href="/psicoterapia" className="text-mauve-400 underline">
            Psicoterapia
          </Link>
          .
        </p>
      </GlassCard>
    )
  }

  if (!isSessionReady) {
    return (
      <GlassCard className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Firma con tu wallet para administrar los horarios que ven los pacientes en tu perfil
          público.
        </p>
        <SiweSessionBanner compact />
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      <WeeklyAvailabilityCalendar
        onPublished={() => {
          if (psmId) void loadSlots(psmId)
        }}
      />

      <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-mauve-400" />
          <h2 className="text-lg font-semibold">Agregar un horario extra</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Para un cambio puntual que no sigue tu horario semanal. El calendario de
          arriba es la forma normal de publicar.
        </p>
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
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </GlassCard>

      <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-mauve-400" />
          <h2 className="text-lg font-semibold">Horarios publicados</h2>
        </div>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tienes horarios futuros. Agrega al menos uno para que los pacientes puedan agendar.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {shown} horarios en los próximos {horizonDays} días
                {slots.length > shown ? ` · ${slots.length - shown} más adelante` : ''}
              </p>
              <div className="flex gap-1 text-xs">
                {[7, 30].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHorizonDays(value)}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      horizonDays === value
                        ? 'bg-mauve-500/20 text-mauve-300'
                        : 'text-muted-foreground hover:bg-white/5'
                    }`}
                  >
                    {value} días
                  </button>
                ))}
              </div>
            </div>

            {days.map((day) => (
              <details
                key={day.key}
                open={horizonDays === 7}
                className="rounded-lg border border-white/10"
              >
                <summary className="cursor-pointer px-4 py-2 text-sm font-medium capitalize">
                  {day.label}{' '}
                  <span className="font-normal text-muted-foreground">
                    · {day.slots.length}
                  </span>
                </summary>
                <ul className="flex flex-wrap gap-2 px-4 pb-3 pt-1">
                  {day.slots.map((slot) => (
                    <li key={slot.id}>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void removeSlot(slot.id)}
                        title="Eliminar este horario"
                        className="group inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs transition-colors hover:border-red-400/40 hover:text-red-400 disabled:opacity-50"
                      >
                        {hourLabel(slot.startsAt)}
                        <X
                          size={12}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
