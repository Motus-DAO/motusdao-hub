'use client'

import { cn } from '@/lib/utils'

type Option = { value: string; label: string }

type Props = {
  label: string
  options: readonly Option[]
  selected: string[]
  onChange: (next: string[]) => void
  hasError?: boolean
  columns?: 2 | 3
}

export function PsmChipGroup({
  label,
  options,
  selected,
  onChange,
  hasError,
  columns = 2,
}: Props) {
  const toggle = (value: string, checked: boolean) => {
    if (checked) onChange([...selected, value])
    else onChange(selected.filter((item) => item !== value))
  }

  return (
    <div className={cn(hasError && 'rounded-xl border-2 border-red-500/60 bg-red-500/5 p-2')}>
      <label className="block text-sm font-medium mb-2">{label}</label>
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
              checked={selected.includes(option.value)}
              onChange={(e) => toggle(option.value, e.target.checked)}
              className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
