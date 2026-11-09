'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { LoginRequiredModal } from '@/components/ui/LoginRequiredModal'
import { PaymentMethodTags } from './PaymentMethodTags'
import { authFetch, fetchAppSession } from '@/lib/auth/client'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { sessionPriceWmxn } from '@/lib/pricing'
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

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function localDateKey(iso: string) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function TherapistBookingCard({ slug, profile }: Props) {
  const router = useRouter()
  const { sessionState, signing, signError, signIn } = useSiweSession()

  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  // When the user taps "Agendar" while logged out, we resume booking
  // automatically once the wallet/SIWE session becomes available.
  const [pendingBook, setPendingBook] = useState(false)

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

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const slot of slots) {
      const key = localDateKey(slot.startsAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(slot)
    }
    for (const daySlots of map.values()) {
      daySlots.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    }
    return map
  }, [slots])

  useEffect(() => {
    if (slots.length === 0) return
    const first = new Date(slots[0].startsAt)
    setVisibleMonth(new Date(first.getFullYear(), first.getMonth(), 1))
    setSelectedDate(localDateKey(slots[0].startsAt))
    setSelectedSlotId(null)
  }, [slots])

  const today = new Date()
  const todayKey = localDateKey(today.toISOString())
  const selectedDaySlots = selectedDate
    ? (slotsByDate.get(selectedDate) ?? [])
    : []
  const calendarCells = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const daysInMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
      0
    ).getDate()
    return [
      ...Array<null>(offset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ]
  }, [visibleMonth])
  const monthLabel = new Intl.DateTimeFormat('es', {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth)
  const lastSlotDate =
    slots.length > 0 ? new Date(slots[slots.length - 1].startsAt) : null
  const canPrev =
    visibleMonth > new Date(today.getFullYear(), today.getMonth(), 1)
  const canNext = lastSlotDate
    ? visibleMonth <
      new Date(lastSlotDate.getFullYear(), lastSlotDate.getMonth(), 1)
    : false
  const selectedDayLabel = selectedDate
    ? new Intl.DateTimeFormat('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date(`${selectedDate}T12:00:00`))
    : ''

  const submitBooking = useCallback(async () => {
    if (!selectedSlotId) return
    setBooking(true)
    setError(null)
    try {
      const session = await fetchAppSession()
      if (!session.authenticated || !session.userId) {
        setError('No pudimos verificar tu sesión. Intenta de nuevo.')
        return
      }
      if (session.role && session.role !== 'usuario') {
        setError('Solo las cuentas de usuario pueden agendar sesiones.')
        return
      }

      const res = await authFetch(`/api/psm/${slug}/${profile.cardPaymentsEnabled ? 'checkout' : 'book'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.userId, slotId: selectedSlotId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo agendar')
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (data.paymentError) {
        throw new Error(
          data.paymentError === 'session_already_started'
            ? 'Ese horario ya comenzó. Elige otro.'
            : `No se pudo preparar el pago (${data.paymentError}).`
        )
      }
      router.push('/perfil?booked=1')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al agendar')
    } finally {
      setBooking(false)
    }
  }, [selectedSlotId, slug, router, profile.cardPaymentsEnabled])

  // Drives the "not logged in -> WaaP -> sign -> book" flow from the current
  // session state. Logged-in users skip straight to booking.
  const proceedBooking = useCallback(async () => {
    if (!selectedSlotId) return
    setError(null)

    // No wallet yet -> open WaaP/email login, resume after connecting.
    if (sessionState === 'no_wallet') {
      setPendingBook(true)
      setLoginOpen(true)
      return
    }

    // Wallet connected but no app session -> sign SIWE (silent for WaaP wallets).
    if (sessionState === 'needs_signature') {
      const ok = await signIn()
      if (!ok) return
    }

    await submitBooking()
  }, [selectedSlotId, sessionState, signIn, submitBooking])

  // Resume booking once the wallet connects after the login modal.
  useEffect(() => {
    if (!pendingBook) return
    if (sessionState === 'loading' || sessionState === 'no_wallet') return
    setPendingBook(false)
    void proceedBooking()
  }, [pendingBook, sessionState, proceedBooking])

  const canBook = profile.capacityAvailable > 0
  const busy = booking || signing || sessionState === 'loading'
  const displayError = error ?? signError
  const price = sessionPriceWmxn()

  return (
    <>
      <div id="agendar">
      <GlassCard className="sticky top-24 p-6">
        <p className="text-2xl font-bold text-mauve-300">
          {price.test ? `${price.mxn} wMXN (prueba)` : `$${price.usd} USD`}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ sesión</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Solo teleterapia por videollamada</p>
        <p className="mt-2 text-xs text-muted-foreground">
          El pago aparta el horario. Si cancelas con más de 48 horas, se devuelve. Después de eso, el profesional conserva el pago.
        </p>

        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Métodos de pago activados
          </p>
          <PaymentMethodTags methods={profile.paymentMethods} className="mt-1" />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Elige día y hora</span>
        </div>
        <p className="text-xs text-muted-foreground">(En tu zona horaria)</p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-mauve-400" />
          </div>
        ) : slotsByDate.size === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay horarios disponibles pronto. Vuelve a revisar más tarde.
          </p>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  disabled={!canPrev}
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                    )
                  }
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold capitalize">{monthLabel}</p>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  disabled={!canNext}
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                    )
                  }
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendarCells.map((day, index) => {
                  if (day === null) return <span key={`empty-${index}`} />
                  const key = `${visibleMonth.getFullYear()}-${pad2(
                    visibleMonth.getMonth() + 1
                  )}-${pad2(day)}`
                  const hasSlots = slotsByDate.has(key)
                  const isPast = key < todayKey
                  const isSelected = key === selectedDate
                  const isToday = key === todayKey
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!hasSlots || isPast}
                      onClick={() => {
                        setSelectedDate(key)
                        setSelectedSlotId(null)
                      }}
                      aria-label={`Elegir ${key}`}
                      className={`flex h-8 w-full items-center justify-center rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-mauve-500 font-semibold text-white'
                          : hasSlots && !isPast
                            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400'
                            : 'text-muted-foreground/30'
                      } ${isToday && !isSelected ? 'ring-1 ring-mauve-400/40' : ''}`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium capitalize text-muted-foreground">
                {selectedDayLabel || 'Elige un día'}
              </p>
              {selectedDaySlots.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">
                  No hay horarios este día.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {selectedDaySlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                        selectedSlotId === slot.id
                          ? 'border-mauve-400 bg-mauve-500/20 font-semibold text-white'
                          : 'border-white/10 hover:border-mauve-400/50'
                      }`}
                    >
                      {formatSlotTime(slot.startsAt)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {displayError && <p className="mt-3 text-sm text-red-400">{displayError}</p>}

        <CTAButton
          className="mt-4 w-full"
          disabled={!canBook || !selectedSlotId || busy}
          onClick={proceedBooking}
        >
          {booking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Agendando...
            </>
          ) : signing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Firma en tu wallet…
            </>
          ) : canBook ? (
            'Pagar y reservar'
          ) : (
            'Sin cupos disponibles'
          )}
        </CTAButton>
        {signing && (
          <p className="mt-2 text-xs text-muted-foreground">
            Acepta la firma en tu wallet. Si no ves el popup, revisa
            MetaMask/Rabby o la ventana de WaaP.
          </p>
        )}
      </GlassCard>
      </div>

      <LoginRequiredModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
      />
    </>
  )
}
