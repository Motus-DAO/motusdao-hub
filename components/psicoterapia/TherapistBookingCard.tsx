'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { LoginRequiredModal } from '@/components/ui/LoginRequiredModal'
import { authFetch, fetchAppSession } from '@/lib/auth/client'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'
import type { PublicPsmProfile } from '@/lib/psm/public-profile'

type Slot = {
  id: string
  startsAt: string
  endsAt: string
  timezone: string | null
  durationMinutes: number
}

type Props = {
  slug: string
  profile: PublicPsmProfile
}

function formatSlotTime(iso: string) {
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatSlotDate(iso: string) {
  return new Intl.DateTimeFormat('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}

export function TherapistBookingCard({ slug, profile }: Props) {
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchAppSession().then((s) => setUserId(s.authenticated ? s.userId : null))
  }, [])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`/api/psm/${slug}/availability`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al cargar horarios')
        setSlots(data.slots || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar horarios')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const slot of slots) {
      const day = slot.startsAt.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(slot)
    }
    return [...map.entries()].slice(0, 14)
  }, [slots])

  const book = useCallback(async () => {
    if (!selectedSlotId) return
    if (!userId) {
      setLoginOpen(true)
      return
    }
    setBooking(true)
    setError(null)
    try {
      const res = await authFetch(`/api/psm/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, slotId: selectedSlotId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo agendar')
      router.push('/perfil?booked=1')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al agendar')
    } finally {
      setBooking(false)
    }
  }, [selectedSlotId, slug, userId, router])

  const canBook = profile.capacityAvailable > 0

  return (
    <>
      <div id="agendar">
      <GlassCard className="sticky top-24 p-6">
        <p className="text-2xl font-bold text-mauve-300">
          ${PLATFORM_SESSION_PRICE_USD} USD
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ sesión</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Solo teleterapia por videollamada</p>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Elige el horario de la sesión</span>
        </div>
        <p className="text-xs text-muted-foreground">(En tu zona horaria)</p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-mauve-400" />
          </div>
        ) : slotsByDay.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay horarios disponibles pronto. Vuelve a revisar más tarde.
          </p>
        ) : (
          <div className="mt-4 max-h-72 space-y-4 overflow-y-auto pr-1">
            {slotsByDay.map(([day, daySlots]) => (
              <div key={day}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {formatSlotDate(daySlots[0].startsAt)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        selectedSlotId === slot.id
                          ? 'border-mauve-400 bg-mauve-500/20 text-white'
                          : 'border-white/10 hover:border-mauve-400/50'
                      }`}
                    >
                      {formatSlotTime(slot.startsAt)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({slot.durationMinutes} min)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <CTAButton
          className="mt-4 w-full"
          disabled={!canBook || !selectedSlotId || booking}
          onClick={book}
        >
          {booking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Agendando...
            </>
          ) : canBook ? (
            'Agendar sesión'
          ) : (
            'Sin cupos disponibles'
          )}
        </CTAButton>
      </GlassCard>
      </div>

      <LoginRequiredModal
        isOpen={loginOpen}
        onClose={() => {
          setLoginOpen(false)
          fetchAppSession().then((s) => setUserId(s.authenticated ? s.userId : null))
        }}
      />
    </>
  )
}
