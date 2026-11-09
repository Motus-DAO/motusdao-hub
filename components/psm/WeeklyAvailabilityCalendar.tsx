'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Copy, Eraser, Loader2, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { authFetch } from '@/lib/auth/client'

type BlockKind = 'available' | 'break'

type Block = {
  id: string
  weekday: number
  start: number
  end: number
  kind: BlockKind
}

type GeneratedSlot = { startsAt: string; endsAt: string }

const START_HOUR = 7
const END_HOUR = 22
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60
const HOUR_HEIGHT = 44
const SNAP = 15
const SLOT_MINUTES = 50
const BUFFER_MINUTES = 10
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function minuteLabel(minute: number) {
  const hour = Math.floor(minute / 60)
  const mins = minute % 60
  return `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function formatSlot(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function generateSlots(blocks: Block[], weeks: number): GeneratedSlot[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  const slots: GeneratedSlot[] = []
  for (let week = 0; week < weeks; week += 1) {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + week * 7 + weekday)

      const available = blocks.filter(
        (block) => block.weekday === weekday && block.kind === 'available'
      )
      const breaks = blocks.filter(
        (block) => block.weekday === weekday && block.kind === 'break'
      )

      for (const block of available) {
        for (
          let minute = block.start;
          minute + SLOT_MINUTES <= block.end;
          minute += SLOT_MINUTES + BUFFER_MINUTES
        ) {
          const overlapsBreak = breaks.some(
            (brk) => minute < brk.end && minute + SLOT_MINUTES > brk.start
          )
          if (overlapsBreak) continue

          const startsAt = new Date(date)
          startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0)
          if (startsAt <= now) continue

          const endsAt = new Date(startsAt.getTime() + SLOT_MINUTES * 60000)
          slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() })
        }
      }
    }
  }
  return slots
}

export function WeeklyAvailabilityCalendar({
  onPublished,
}: {
  onPublished: () => void | Promise<void>
}) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [mode, setMode] = useState<BlockKind>('available')
  const [drag, setDrag] = useState<{
    weekday: number
    start: number
    end: number
  } | null>(null)
  const [weeks, setWeeks] = useState(8)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const generated = useMemo(() => generateSlots(blocks, weeks), [blocks, weeks])
  const columnHeight = (TOTAL_MIN / 60) * HOUR_HEIGHT

  function minuteFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height))
    const minute = START_HOUR * 60 + (y / rect.height) * TOTAL_MIN
    return Math.round(minute / SNAP) * SNAP
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>, weekday: number) {
    if ((event.target as HTMLElement).closest('[data-block]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const start = minuteFromEvent(event)
    setDrag({ weekday, start, end: Math.min(start + SNAP, END_HOUR * 60) })
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>, weekday: number) {
    if (!drag || drag.weekday !== weekday) return
    const current = minuteFromEvent(event)
    setDrag((prev) =>
      prev
        ? {
            ...prev,
            end: Math.max(current, prev.start + SNAP),
          }
        : prev
    )
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>, weekday: number) {
    if (!drag || drag.weekday !== weekday) return
    const start = Math.min(drag.start, drag.end)
    const end = Math.max(drag.start, drag.end)
    if (end - start >= SNAP) {
      setBlocks((prev) => [
        ...prev,
        { id: newId(), weekday, start, end, kind: mode },
      ])
    }
    setDrag(null)
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((block) => block.id !== id))
  }

  function copyMonday() {
    const monday = blocks.filter((block) => block.weekday === 0)
    if (monday.length === 0) return
    const copies = [1, 2, 3, 4].flatMap((weekday) =>
      monday.map((block) => ({
        ...block,
        id: newId(),
        weekday,
      }))
    )
    setBlocks((prev) => [
      ...prev.filter((block) => block.weekday === 0 || block.weekday > 4),
      ...copies,
    ])
  }

  async function publish() {
    setPublishing(true)
    setError('')
    setNotice('')
    try {
      if (generated.length === 0) {
        throw new Error('Dibuja al menos un bloque disponible.')
      }
      const response = await authFetch('/api/provider-availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: generated,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      const data = (await response.json()) as {
        created?: number
        skipped?: number
        error?: string
      }
      if (!response.ok) throw new Error(data.error || 'No se pudieron publicar')
      setNotice(
        `${data.created ?? 0} horarios publicados. ${
          data.skipped ? `${data.skipped} omitidos por duplicado o choque.` : ''
        }`
      )
      await onPublished()
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : 'No se pudieron publicar'
      )
    } finally {
      setPublishing(false)
    }
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-mauve-400" />
            <h2 className="text-lg font-semibold">Horario semanal</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Arrastra sobre un día para crear un bloque. Marca “Comida” para bloquear
            un hueco. Se generan sesiones de {SLOT_MINUTES} min con {BUFFER_MINUTES} min
            de descanso.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={copyMonday}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar lunes
          </button>
          <button
            type="button"
            onClick={() => setBlocks([])}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Eraser className="h-3.5 w-3.5" />
            Limpiar
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pincel
        </span>
        <button
          type="button"
          onClick={() => setMode('available')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            mode === 'available'
              ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
              : 'border-white/10 text-muted-foreground'
          }`}
        >
          Disponible
        </button>
        <button
          type="button"
          onClick={() => setMode('break')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            mode === 'break'
              ? 'border-slate-400/50 bg-slate-500/15 text-slate-200'
              : 'border-white/10 text-muted-foreground'
          }`}
        >
          Comida / break
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {blocks.filter((block) => block.kind === 'available').length} bloques
          disponibles
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-white/10 pb-2">
            <span />
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="text-center text-xs font-semibold text-muted-foreground"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
            <div className="relative" style={{ height: columnHeight }}>
              {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => {
                const hour = START_HOUR + index
                return (
                  <span
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
                    style={{ top: index * HOUR_HEIGHT }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </span>
                )
              })}
            </div>

            {WEEKDAYS.map((day, weekday) => (
              <div
                key={day}
                className="relative border-l border-white/10"
                style={{
                  height: columnHeight,
                  touchAction: 'none',
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 44px)',
                }}
                onPointerDown={(event) => startDrag(event, weekday)}
                onPointerMove={(event) => moveDrag(event, weekday)}
                onPointerUp={(event) => endDrag(event, weekday)}
                onPointerCancel={() => setDrag(null)}
              >
                {blocks
                  .filter((block) => block.weekday === weekday)
                  .map((block) => {
                    const top = ((block.start - START_HOUR * 60) / 60) * HOUR_HEIGHT
                    const height = Math.max(
                      ((block.end - block.start) / 60) * HOUR_HEIGHT,
                      14
                    )
                    return (
                      <div
                        key={block.id}
                        data-block
                        title={`${minuteLabel(block.start)}–${minuteLabel(block.end)}`}
                        className={`absolute left-0.5 right-0.5 overflow-hidden rounded-md border px-1.5 py-1 text-[10px] font-semibold ${
                          block.kind === 'available'
                            ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                            : 'border-slate-400/30 bg-slate-500/25 text-slate-200'
                        }`}
                        style={{ top, height }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="truncate">
                            {block.kind === 'available' ? 'Disponible' : 'Comida'}
                          </span>
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => removeBlock(block.id)}
                            className="shrink-0 rounded p-0.5 hover:bg-black/20"
                            aria-label="Quitar bloque"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="block truncate opacity-80">
                          {minuteLabel(block.start)}–{minuteLabel(block.end)}
                        </span>
                      </div>
                    )
                  })}

                {drag?.weekday === weekday && (
                  <div
                    className={`pointer-events-none absolute left-0.5 right-0.5 rounded-md border ${
                      mode === 'available'
                        ? 'border-emerald-300 bg-emerald-400/25'
                        : 'border-slate-300 bg-slate-400/20'
                    }`}
                    style={{
                      top:
                        ((Math.min(drag.start, drag.end) - START_HOUR * 60) / 60) *
                        HOUR_HEIGHT,
                      height: Math.max(
                        ((Math.abs(drag.end - drag.start)) / 60) * HOUR_HEIGHT,
                        10
                      ),
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Aplicar a
          <select
            value={weeks}
            onChange={(event) => setWeeks(Number(event.target.value))}
            className="rounded-lg border border-white/10 bg-background/50 px-2 py-1 text-sm text-foreground"
          >
            <option value={4}>4 semanas</option>
            <option value={8}>8 semanas</option>
            <option value={12}>12 semanas</option>
          </select>
        </label>
        <span className="text-xs text-muted-foreground">
          {generated.length} sesiones de {SLOT_MINUTES} min
        </span>
        <CTAButton
          size="sm"
          className="ml-auto"
          onClick={() => void publish()}
          disabled={publishing || generated.length === 0}
        >
          {publishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publicando...
            </>
          ) : (
            'Publicar horarios'
          )}
        </CTAButton>
      </div>

      {generated.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Primera: {formatSlot(generated[0].startsAt)} · Última:{' '}
          {formatSlot(generated[generated.length - 1].startsAt)}
        </p>
      )}

      {notice && (
        <div
          role="status"
          className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-500/15 p-3 text-sm text-emerald-100"
        >
          {notice}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </GlassCard>
  )
}
