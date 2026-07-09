'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, Loader2, Plus, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { authFetch, fetchAppSession } from '@/lib/auth/client'
import { useSiweSession } from '@/lib/auth/use-siwe-session'

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
      <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-mauve-400" />
          <h2 className="text-lg font-semibold">Agregar horario</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Los pacientes verán estos bloques en tu perfil de Psicoterapia. Próximamente podrás
          sincronizar con Google Calendar; por ahora gestión manual aquí.
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
          <ul className="space-y-3">
            {slots.map((slot) => (
              <li
                key={slot.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3"
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
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  )
}
