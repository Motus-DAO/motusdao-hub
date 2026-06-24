'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { inputFieldClass } from '@/lib/onboarding-form-helpers'
import {
  PSM_ESPECIALIDAD_PRESETS,
  mergeEspecialidades,
  splitEspecialidades,
} from '@/lib/intake/psm-intake-options'
import { PsmChipGroup } from './PsmChipGroup'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  hasError?: boolean
  errorMessage?: string
}

export function PsmEspecialidadesField({ value, onChange, hasError, errorMessage }: Props) {
  const initial = splitEspecialidades(value)
  const [presets, setPresets] = useState(initial.presets)
  const [customText, setCustomText] = useState(initial.customText)
  const [showOpenField, setShowOpenField] = useState(true)

  useEffect(() => {
    const next = splitEspecialidades(value)
    setPresets(next.presets)
    setCustomText(next.customText)
    if (next.customText.length > 0 || value.includes('otros')) {
      setShowOpenField(true)
    }
  }, [value])

  const sync = (nextPresets: string[], nextCustomText: string) => {
    onChange(mergeEspecialidades(nextPresets, nextCustomText))
  }

  const handlePresetsChange = (nextPresets: string[]) => {
    setPresets(nextPresets)
    sync(nextPresets, customText)
  }

  const handleCustomTextChange = (nextCustomText: string) => {
    setCustomText(nextCustomText)
    sync(presets, nextCustomText)
  }

  return (
    <div className="space-y-3">
      <PsmChipGroup
        label="Especialización / temas *"
        options={PSM_ESPECIALIDAD_PRESETS}
        selected={presets}
        onChange={handlePresetsChange}
        hasError={hasError}
        columns={3}
      />

      <button
        type="button"
        onClick={() => setShowOpenField((open) => !open)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
      >
        <span>{showOpenField ? 'Ocultar campo abierto' : '¿Tu especialización no está en la lista? Escribe otros temas'}</span>
        {showOpenField ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>

      {showOpenField && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <label htmlFor="especialidades-otras" className="block text-sm font-medium">
            Otra especialización o temas
          </label>
          <p className="text-xs text-muted-foreground">
            Campo abierto para temas o poblaciones que no aparecen arriba. Separa con comas si son
            varios (ej. neuropsicología, TOC, acompañamiento perinatal).
          </p>
          <input
            id="especialidades-otras"
            type="text"
            value={customText}
            onChange={(event) => handleCustomTextChange(event.target.value)}
            placeholder="Ej: neuropsicología, acompañamiento perinatal, TOC"
            className={inputFieldClass(hasError)}
          />
        </div>
      )}

      {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}
    </div>
  )
}
