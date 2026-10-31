'use client'

import {
  BITACORA_ENTRY_KIND_META,
  BITACORA_ENTRY_KINDS,
  entryKindShowsMood,
  entryListTitle,
  type BitacoraEntryKind,
} from '@/lib/safe-notes/entry-types'
import type { BitacoraEntryView } from '@/lib/safe-notes/client-bitacora'

type FilterValue = BitacoraEntryKind | 'all'

type Props = {
  value: FilterValue
  onChange: (value: FilterValue) => void
  entries: BitacoraEntryView[]
}

export function BitacoraKindFilter({ value, onChange, entries }: Props) {
  const counts = entries.reduce(
    (acc, e) => {
      acc[e.kind] = (acc[e.kind] ?? 0) + 1
      return acc
    },
    {} as Partial<Record<BitacoraEntryKind, number>>
  )

  const pills: { id: FilterValue; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: entries.length },
    ...BITACORA_ENTRY_KINDS.map((kind) => ({
      id: kind,
      label: BITACORA_ENTRY_KIND_META[kind].label,
      count: counts[kind] ?? 0,
    })).filter((p) => p.count > 0 || p.id === value),
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => onChange(pill.id)}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
            value === pill.id
              ? 'border-mauve-500 bg-mauve-500/20 text-foreground'
              : 'border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground'
          }`}
        >
          {pill.label}
          <span className="ml-1.5 text-xs opacity-70">{pill.count}</span>
        </button>
      ))}
    </div>
  )
}

export { entryKindShowsMood, entryListTitle }
