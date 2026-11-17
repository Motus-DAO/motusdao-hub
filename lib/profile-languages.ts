export const PROFILE_LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
] as const

export const KNOWN_PROFILE_LANGUAGE_CODES = new Set<string>(
  PROFILE_LANGUAGE_OPTIONS.map((o) => o.value),
)

const LEGACY_LABELS: Record<string, string> = {
  fr: 'Francés',
}

/** Split stored DB values into known codes and a single custom free-text language (if any). */
export function splitProfileLanguages(values: string[] | undefined): {
  known: string[]
  custom: string
} {
  const source = values?.length ? values : ['es']
  const known = source.filter((v) => KNOWN_PROFILE_LANGUAGE_CODES.has(v))
  const customParts = source
    .filter((v) => !KNOWN_PROFILE_LANGUAGE_CODES.has(v))
    .map((v) => LEGACY_LABELS[v] || v)
  return {
    known: known.length ? known : ['es'],
    custom: customParts.join(', '),
  }
}

/** Merge UI state into array persisted on PatientProfile / PSMProfile. */
export function mergeProfileLanguages(known: string[], customText: string): string[] {
  const base = known.filter((v) => KNOWN_PROFILE_LANGUAGE_CODES.has(v))
  const extra = customText.trim()
  if (!base.length && !extra) return ['es']
  return extra ? [...base, extra] : base
}