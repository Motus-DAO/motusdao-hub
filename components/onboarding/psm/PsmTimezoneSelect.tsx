'use client'

import { useMemo } from 'react'
import { inputFieldClass } from '@/lib/onboarding-form-helpers'
import {
  getPsmTimezoneGroups,
  getTimezoneDisplayLabel,
  isKnownPsmTimezone,
} from '@/lib/intake/psm-timezone-options'

type Props = {
  value: string
  onChange: (value: string) => void
  preferredCountry?: string
  hasError?: boolean
  errorMessage?: string
}

export function PsmTimezoneSelect({
  value,
  onChange,
  preferredCountry,
  hasError,
  errorMessage,
}: Props) {
  const groups = useMemo(() => getPsmTimezoneGroups(), [])

  const sortedGroups = useMemo(() => {
    if (!preferredCountry || preferredCountry === 'otros') return groups
    const preferred = groups.find((g) => g.country === preferredCountry)
    const rest = groups.filter((g) => g.country !== preferredCountry)
    return preferred ? [preferred, ...rest] : groups
  }, [groups, preferredCountry])

  const showLegacyOption = value && !isKnownPsmTimezone(value)

  return (
    <div className="space-y-2">
      <label htmlFor="psm-timezone" className="block text-sm font-medium">
        Zona horaria *
      </label>
      <p className="text-xs text-muted-foreground">
        Elige tu país y ciudad. Así coordinamos tus sesiones de teleterapia sin que tengas que
        conocer nombres técnicos de zona horaria.
      </p>
      <select
        id="psm-timezone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputFieldClass(hasError)}
      >
        <option value="">Selecciona tu zona horaria</option>
        {showLegacyOption && (
          <option value={value}>{getTimezoneDisplayLabel(value)} (guardada)</option>
        )}
        {sortedGroups.map((group) => (
          <optgroup key={group.country} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.offset ? `${option.label} (${option.offset})` : option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}
    </div>
  )
}
