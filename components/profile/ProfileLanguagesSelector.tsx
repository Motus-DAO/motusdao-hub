'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  KNOWN_PROFILE_LANGUAGE_CODES,
  mergeProfileLanguages,
  PROFILE_LANGUAGE_OPTIONS,
  splitProfileLanguages,
} from '@/lib/profile-languages'
import { cn } from '@/lib/utils'

type ProfileLanguagesSelectorProps = {
  value: string[]
  onChange: (languages: string[]) => void
  disabled?: boolean
}

export function ProfileLanguagesSelector({
  value,
  onChange,
  disabled = false,
}: ProfileLanguagesSelectorProps) {
  const split = useMemo(() => splitProfileLanguages(value), [value])
  const [customText, setCustomText] = useState(split.custom)
  const [wantsOther, setWantsOther] = useState(split.custom.length > 0)

  useEffect(() => {
    setCustomText(split.custom)
    setWantsOther(split.custom.length > 0)
  }, [split.custom])

  const selectedKnown = split.known.filter((v) => KNOWN_PROFILE_LANGUAGE_CODES.has(v))

  const commit = (known: string[], custom: string, includeCustom: boolean) => {
    onChange(mergeProfileLanguages(known, includeCustom ? custom : ''))
  }

  const toggle = (code: string) => {
    if (disabled) return
    const next = selectedKnown.includes(code)
      ? selectedKnown.filter((v) => v !== code)
      : [...selectedKnown, code]
    if (next.length === 0) return
    commit(next, customText, wantsOther)
  }

  const toggleOther = () => {
    if (disabled) return
    const next = !wantsOther
    setWantsOther(next)
    if (!next) {
      setCustomText('')
      commit(selectedKnown, '', false)
    }
  }

  return (
    <div className="space-y-3">
      <ProfileLanguageFieldLabel
        title="Idiomas"
        hint="Puedes elegir varios. Sirve para emparejamiento y comunicación con tu profesional."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PROFILE_LANGUAGE_OPTIONS.map((opt) => {
          const active = selectedKnown.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => toggle(opt.value)}
              className={cn(
                'rounded-xl border px-3 py-2 text-sm transition-colors disabled:opacity-50',
                active
                  ? 'border-mauve-400 bg-mauve-500/25 text-foreground'
                  : 'border-white/15 bg-white/[0.03] text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          )
        })}
        <button
          type="button"
          disabled={disabled}
          aria-pressed={wantsOther}
          onClick={toggleOther}
          className={cn(
            'rounded-xl border px-3 py-2 text-sm transition-colors disabled:opacity-50',
            wantsOther
              ? 'border-mauve-400 bg-mauve-500/25 text-foreground'
              : 'border-white/15 bg-white/[0.03] text-muted-foreground hover:text-foreground',
          )}
        >
          Otro
        </button>
      </div>
      {wantsOther && (
        <ProfileLanguageCustomInput
          disabled={disabled}
          value={customText}
          onChange={(text: string) => {
            setCustomText(text)
            commit(selectedKnown, text, true)
          }}
        />
      )}
    </div>
  )
}

function ProfileLanguageFieldLabel({
  title,
  hint,
  className = '',
}: {
  title: string
  hint: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </div>
  )
}

function ProfileLanguageCustomInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder="Ej. Catalán, Lengua de señas…"
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 disabled:opacity-50"
    />
  )
}