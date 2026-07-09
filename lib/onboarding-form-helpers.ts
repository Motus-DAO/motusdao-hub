import type { FieldErrors } from 'react-hook-form'
import { cn } from '@/lib/utils'
import type { OnboardingData } from '@/lib/onboarding-store'
import { buildPsmFormDefaults } from '@/lib/intake/psm-intake-v1'
import { psmFieldLabel } from '@/lib/intake/psm-intake-v1'

/** Opaque, theme-safe inputs for onboarding forms (readable in light + dark). */
export function inputFieldClass(hasError?: boolean, extra?: string) {
  return cn(
    'w-full px-4 py-3 rounded-xl focus-ring smooth-transition',
    'bg-background text-foreground border border-border',
    'placeholder:text-muted-foreground',
    '[&>option]:bg-background [&>option]:text-foreground',
    hasError
      ? 'border-2 border-red-500/80 ring-2 ring-red-500/25 bg-red-500/5'
      : '',
    extra
  )
}

export const onboardingFormSurfaceClass =
  'rounded-xl border border-border bg-card/90 p-4 text-foreground shadow-sm'

export function groupFieldClass(hasError?: boolean) {
  return cn(
    hasError && 'rounded-xl border-2 border-red-500/60 bg-red-500/5 p-2 ring-1 ring-red-500/20'
  )
}

export function flattenFormErrors(
  errors: FieldErrors,
  prefix = ''
): Array<{ field: string; message: string }> {
  const result: Array<{ field: string; message: string }> = []

  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (!value) continue

    if ('message' in value && typeof value.message === 'string') {
      result.push({ field: path, message: value.message })
      continue
    }

    if (typeof value === 'object') {
      result.push(...flattenFormErrors(value as FieldErrors, path))
    }
  }

  return result
}

export function labelForField(field: string): string {
  const root = field.split('.')[0]
  return psmFieldLabel(root)
}

export function buildPsmFormValues(data: Partial<OnboardingData>) {
  return buildPsmFormDefaults(data)
}

export function normalizePhone(value: unknown): string {
  return String(value ?? '').replace(/[\s\-().]/g, '')
}
