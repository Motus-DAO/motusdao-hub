'use client'

import { ACCENT_COLOR_OPTIONS, getEffectiveAccentColor } from '@/lib/accent-color'
import { useUIStore, type AccentColor } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface MatrixColorSelectorProps {
  onColorChange?: (color: AccentColor) => void
}

export function MatrixColorSelector({ onColorChange }: MatrixColorSelectorProps) {
  const { theme, accentColor, setAccentColor } = useUIStore()
  const selectedColor = getEffectiveAccentColor(theme, accentColor)

  const handleColorSelect = (color: AccentColor) => {
    setAccentColor(color)
    onColorChange?.(color)
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Color de acento
      </label>
      <div className="grid grid-cols-5 gap-3">
        {ACCENT_COLOR_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleColorSelect(option.value)}
            className={cn(
              "group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
              "hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              selectedColor === option.value
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
            aria-label={`Seleccionar color ${option.label}`}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform duration-200"
              style={{
                background: option.swatch,
                boxShadow: selectedColor === option.value 
                  ? `0 0 20px ${option.rgb}, 0 0 40px ${option.rgb}` 
                  : `0 4px 12px rgba(0,0,0,0.3)`
              }}
            >
              {selectedColor === option.value && (
                <Check className="w-5 h-5 text-black font-bold" strokeWidth={3} />
              )}
            </div>
            <span className="text-xs font-medium text-center">
              {option.label}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Aplica a botones, iconos y la barra de desplazamiento en todos los temas. Rosa coincide con el degradado Motus; Matrix inicia en verde hasta que elijas un color.
      </p>
    </div>
  )
}
