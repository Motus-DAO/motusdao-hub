'use client'

import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { inputFieldClass } from '@/lib/onboarding-form-helpers'

type Option = { value: string; label: string }

type Props = {
  label: string
  options: readonly Option[]
  /** Stored array: preset values (slugs) + custom values stored exactly as typed. */
  value: string[]
  onChange: (next: string[]) => void
  hasError?: boolean
  errorMessage?: string
  hint?: string
  columns?: 2 | 3
  addLabel?: string
  addPlaceholder?: string
}

/**
 * Preset chips + always-visible custom tag input.
 * Presets are stored as their slug value; custom entries are stored exactly as typed.
 * Replaces the old "Otro" chip + collapsible field pattern.
 */
export function PsmTagSelect({
  label,
  options,
  value,
  onChange,
  hasError,
  errorMessage,
  hint,
  columns = 2,
  addLabel = 'Agregar otro',
  addPlaceholder = 'Escribe y presiona Enter',
}: Props) {
  const [draft, setDraft] = useState('')

  const presetValues = useMemo(() => new Set(options.map((o) => o.value)), [options])
  const selectedPresets = value.filter((v) => presetValues.has(v))
  const customTags = value.filter((v) => !presetValues.has(v))

  const emit = (presets: string[], customs: string[]) => {
    const orderedPresets = options.map((o) => o.value).filter((v) => presets.includes(v))
    onChange([...orderedPresets, ...customs])
  }

  const togglePreset = (slug: string, checked: boolean) => {
    const nextPresets = checked
      ? [...selectedPresets, slug]
      : selectedPresets.filter((v) => v !== slug)
    emit(nextPresets, customTags)
  }

  const addCustom = () => {
    const entry = draft.trim()
    if (!entry) return
    const exists =
      customTags.some((t) => t.toLowerCase() === entry.toLowerCase()) ||
      options.some((o) => o.label.toLowerCase() === entry.toLowerCase())
    if (!exists) emit(selectedPresets, [...customTags, entry])
    setDraft('')
  }

  const removeCustom = (tag: string) => {
    emit(
      selectedPresets,
      customTags.filter((t) => t !== tag)
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addCustom()
    }
  }

  return (
    <div className={cn(hasError && 'rounded-xl border-2 border-red-500/60 bg-red-500/5 p-2')}>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}

      <div
        className={cn(
          'grid gap-2',
          columns === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center space-x-2 p-2 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedPresets.includes(option.value)}
              onChange={(e) => togglePreset(option.value, e.target.checked)}
              className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={addPlaceholder}
            aria-label={addLabel}
            className={inputFieldClass(false)}
          />
          <button
            type="button"
            onClick={addCustom}
            className="shrink-0 px-3 rounded-xl border border-white/15 bg-white/5 text-sm text-muted-foreground hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
        </div>

        {customTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-mauve-500/20 text-mauve-200 px-3 py-1 text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeCustom(tag)}
                  aria-label={`Quitar ${tag}`}
                  className="hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {errorMessage && <p className="text-red-400 text-sm mt-2">{errorMessage}</p>}
    </div>
  )
}
