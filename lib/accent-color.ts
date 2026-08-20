export const ACCENT_COLORS = ['green', 'red', 'orange', 'blue', 'pink'] as const

export type AccentColor = (typeof ACCENT_COLORS)[number]
/** @deprecated Use AccentColor — kept so existing matrix color call sites type-check. */
export type MatrixColor = AccentColor

export type AppTheme = 'light' | 'dark' | 'matrix'

export const DEFAULT_ACCENT_BY_THEME: Record<AppTheme, AccentColor> = {
  light: 'pink',
  dark: 'pink',
  matrix: 'green',
}

export const ACCENT_COLOR_OPTIONS: {
  value: AccentColor
  label: string
  swatch: string
  rgb: string
}[] = [
  { value: 'green', label: 'Verde', swatch: '#39ff14', rgb: 'rgb(57, 255, 20)' },
  { value: 'red', label: 'Rojo', swatch: '#ff1744', rgb: 'rgb(255, 23, 68)' },
  { value: 'orange', label: 'Naranja', swatch: '#ff9100', rgb: 'rgb(255, 145, 0)' },
  { value: 'blue', label: 'Azul', swatch: '#00e5ff', rgb: 'rgb(0, 229, 255)' },
  { value: 'pink', label: 'Rosa', swatch: 'linear-gradient(to right, #9333ea, #ec4899)', rgb: 'rgb(236, 72, 153)' },
]

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && (ACCENT_COLORS as readonly string[]).includes(value)
}

export function getEffectiveAccentColor(
  theme: AppTheme,
  accentColor: AccentColor | null | undefined
): AccentColor {
  if (isAccentColor(accentColor)) return accentColor
  return DEFAULT_ACCENT_BY_THEME[theme]
}

/**
 * Persist migration: old stores always saved matrixColor (default green).
 * Treat green as "never customized" so light/dark can default to pink.
 */
export function migratePersistedAccentColor(matrixColor: unknown): AccentColor | null {
  if (!isAccentColor(matrixColor) || matrixColor === 'green') return null
  return matrixColor
}
