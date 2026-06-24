'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { inputFieldClass } from '@/lib/onboarding-form-helpers'
import {
  PSM_THERAPY_STYLES,
  mergeTherapyStyles,
  splitTherapyStyles,
} from '@/lib/intake/psm-intake-options'
import { PsmChipGroup } from './PsmChipGroup'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  hasError?: boolean
  errorMessage?: string
}

export function PsmTherapyStyleField({ value, onChange, hasError, errorMessage }: Props) {
  const initial = splitTherapyStyles(value)
  const [presets, setPresets] = useState(initial.presets)
  const [customText, setCustomText] = useState(initial.customText)
  const [showOpenField, setShowOpenField] = useState(true)

  useEffect(() => {
    const next = splitTherapyStyles(value)
    setPresets(next.presets)
    setCustomText(next.customText)
    if (next.customText.length > 0 || value.includes('otro') || value.includes('otros')) {
      setShowOpenField(true)
    }
  }, [value])

  const sync = (nextPresets: string[], nextCustomText: string) => {
    onChange(mergeTherapyStyles(nextPresets, nextCustomText))
  }

  const handlePresetsChange = (nextPresets: string[]) => {
    setPresets(nextPresets)
    if (nextPresets.includes('otro') || nextPresets.includes('otros')) {
      setShowOpenField(true)
    }
    sync(nextPresets, customText)
  }

  const handleCustomTextChange = (nextCustomText: string) => {
    setCustomText(nextCustomText)
    sync(presets, nextCustomText)
  }

  return (
    <div className="space-y-3">
      <PsmChipGroup
        label="Enfoque terapéutico *"
        options={PSM_THERAPY_STYLES}
        selected={presets}
        onChange={handlePresetsChange}
        hasError={hasError}
      />

      <button
        type="button"
        onClick={() => setShowOpenField((open) => !open)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
      >
        <span>
          {showOpenField
            ? 'Ocultar campo abierto'
            : '¿Tu enfoque no está en la lista? Escribe otro enfoque'}
        </span>
        {showOpenField ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </button>

      {showOpenField && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <label htmlFor="therapy-style-otro" className="block text-sm font-medium">
            Otro enfoque terapéutico
          </label>
          <p className="text-xs text-muted-foreground">
            Campo abierto si tu enfoque no aparece arriba. Separa con comas si combinas varios (ej.
            EMDR, gestalt, terapia breve estratégica).
          </p>
          <input
            id="therapy-style-otro"
            type="text"
            value={customText}
            onChange={(event) => handleCustomTextChange(event.target.value)}
            placeholder="Ej: EMDR, gestalt, terapia narrativa"
            className={inputFieldClass(hasError)}
          />
        </div>
      )}

      {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}
    </div>
  )
}
