'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BITACORA_ENTRY_KINDS,
  BITACORA_ENTRY_KIND_META,
  type BitacoraEntryKind,
} from '@/lib/safe-notes/entry-types'

type Props = {
  value: BitacoraEntryKind
  onChange: (kind: BitacoraEntryKind) => void
  disabled?: boolean
  id?: string
}

export function BitacoraKindPicker({ value, onChange, disabled, id }: Props) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const meta = BITACORA_ENTRY_KIND_META[value]

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 280),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const pick = (kind: BitacoraEntryKind) => {
    onChange(kind)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'w-full sm:w-auto min-w-[200px] rounded-2xl border border-white/15 bg-foreground/5 backdrop-blur-xl px-4 h-11 flex items-center justify-between gap-2',
          'hover:bg-foreground/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve-500/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
              meta.chipClass
            )}
          >
            {meta.label}
          </span>
        </span>
        <ChevronDown
          className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" aria-hidden onClick={() => setOpen(false)} />
            <div
              role="listbox"
              aria-label="Categoría de entrada"
              className="fixed z-[101] rounded-2xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-lg p-1 max-h-[min(70vh,420px)] overflow-y-auto"
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
              }}
            >
              <div className="space-y-0.5">
                {BITACORA_ENTRY_KINDS.map((kind) => {
                  const k = BITACORA_ENTRY_KIND_META[kind]
                  const selected = kind === value
                  return (
                    <button
                      key={kind}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => pick(kind)}
                      className={cn(
                        'w-full text-left rounded-xl px-3 py-2.5 transition-colors',
                        selected
                          ? 'bg-mauve-500/15 text-foreground'
                          : 'text-foreground/90 hover:bg-foreground/5'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1',
                          k.chipClass
                        )}
                      >
                        {k.label}
                      </span>
                      <span className="block text-xs text-muted-foreground leading-snug">
                        {k.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
