import type { PsychatStructuredMode } from '@/lib/psychat-prompt'

export const PSYCHAT_STRUCTURED_OUTPUT_ERROR =
  'No pudimos formar la respuesta estructurada de Psychat. Intenta de nuevo en un momento.'

export const SUPERVISOR_FIELD_KEYS = [
  'apertura',
  'reflexion',
  'cierre',
  'recomendacion',
  'disponibilidad',
] as const

export const EXPLORACION_FIELD_KEYS = [
  'eco',
  'pregunta',
  'abierto',
  'limite',
  'puenteHumano',
] as const

export type SupervisorFields = Record<(typeof SUPERVISOR_FIELD_KEYS)[number], string>
export type ExploracionFields = Record<(typeof EXPLORACION_FIELD_KEYS)[number], string>

export function parseStructuredOutput(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
  const jsonText = fenced || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed
  return JSON.parse(jsonText) as Record<string, unknown>
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function pickFields(
  parsed: Record<string, unknown>,
  keys: readonly string[]
): Record<string, string> | null {
  const out: Record<string, string> = {}
  for (const key of keys) {
    const value = stringField(parsed[key])
    if (!value) return null
    out[key] = value
  }
  return out
}

/** Reject cross-mode payloads (e.g. supervisor keys when exploracion was requested). */
export function validateStructuredPayload(
  mode: PsychatStructuredMode,
  parsed: Record<string, unknown>
): SupervisorFields | ExploracionFields | null {
  const hasSupervisorShape = SUPERVISOR_FIELD_KEYS.some((key) => stringField(parsed[key]))
  const hasExploracionShape = EXPLORACION_FIELD_KEYS.some((key) => stringField(parsed[key]))

  if (mode === 'exploracion') {
    if (hasSupervisorShape && !hasExploracionShape) return null
    return pickFields(parsed, EXPLORACION_FIELD_KEYS) as ExploracionFields | null
  }

  if (hasExploracionShape && !hasSupervisorShape) return null
  return pickFields(parsed, SUPERVISOR_FIELD_KEYS) as SupervisorFields | null
}

export function stripStructuredMetadata(parsed: Record<string, unknown>): Record<string, unknown> {
  const { mode: _mode, ...rest } = parsed
  return rest
}
