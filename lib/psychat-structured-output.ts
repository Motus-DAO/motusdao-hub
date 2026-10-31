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

function normalizeSectionHeading(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

const SUPERVISOR_HEADING_TO_KEY: Record<string, (typeof SUPERVISOR_FIELD_KEYS)[number]> = {
  'apertura de significantes': 'apertura',
  apertura: 'apertura',
  'reflexion sobre el discurso': 'reflexion',
  reflexion: 'reflexion',
  'cierre analitico': 'cierre',
  cierre: 'cierre',
  'recomendacion final': 'recomendacion',
  recomendacion: 'recomendacion',
  disponibilidad: 'disponibilidad',
}

const EXPLORACION_HEADING_TO_KEY: Record<string, (typeof EXPLORACION_FIELD_KEYS)[number]> = {
  'eco breve': 'eco',
  eco: 'eco',
  'una pregunta': 'pregunta',
  pregunta: 'pregunta',
  'lo que queda abierto': 'abierto',
  abierto: 'abierto',
  limite: 'limite',
  'puente humano': 'puenteHumano',
  puentehumano: 'puenteHumano',
}

function mapHeadingToKey(
  heading: string,
  mode: PsychatStructuredMode
): string | null {
  const headingMap = mode === 'supervisor' ? SUPERVISOR_HEADING_TO_KEY : EXPLORACION_HEADING_TO_KEY
  const normalized = normalizeSectionHeading(heading.replace(/^\*\*|\*\*$/g, '').replace(/:$/, ''))
  return headingMap[normalized] ?? null
}

function sectionsFromHeadingStream(
  text: string,
  mode: PsychatStructuredMode,
  detectHeading: (line: string) => string | null
): Record<string, unknown> | null {
  const sections: Record<string, string> = {}
  const lines = text.split(/\r?\n/)
  let currentKey: string | null = null
  let buffer: string[] = []

  const flush = () => {
    if (!currentKey) return
    const body = buffer.join('\n').trim()
    if (body) sections[currentKey] = body
    buffer = []
  }

  for (const line of lines) {
    const heading = detectHeading(line)
    if (heading) {
      flush()
      currentKey = mapHeadingToKey(heading, mode)
      continue
    }
    if (currentKey) buffer.push(line)
  }
  flush()

  if (Object.keys(sections).length === 0) return null
  return sections
}

/** Venice and some OpenAI runs return markdown sections instead of raw JSON. */
export function parseStructuredMarkdownSections(
  text: string,
  mode: PsychatStructuredMode
): Record<string, unknown> | null {
  const hashHeadings = sectionsFromHeadingStream(text, mode, (line) => {
    const m = line.match(/^#{1,3}\s+(.+?)\s*$/)
    return m ? m[1] : null
  })
  if (hashHeadings) return hashHeadings

  const boldHeadings = sectionsFromHeadingStream(text, mode, (line) => {
    const m = line.match(/^\s*\*\*(.+?)\*\*\s*:?\s*$/)
    return m ? m[1] : null
  })
  if (boldHeadings) return boldHeadings

  const labeled = sectionsFromHeadingStream(text, mode, (line) => {
    const m = line.match(/^\s*(?:[-*]\s*)?(?:\*\*)?(.+?)(?:\*\*)?\s*:\s*$/)
    if (!m) return null
    const label = m[1].trim()
    if (label.length < 3 || label.length > 80) return null
    return label
  })
  return labeled
}

function normalizeJsonKeys(
  parsed: Record<string, unknown>,
  mode: PsychatStructuredMode
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...parsed }
  for (const [key, value] of Object.entries(parsed)) {
    const mapped = mapHeadingToKey(key, mode)
    if (mapped && !(mapped in out)) out[mapped] = value
  }
  return out
}

/** Parse model text into validated structured fields (JSON or markdown sections). */
export function extractPsychatStructuredFields(
  mode: PsychatStructuredMode,
  text: string
): SupervisorFields | ExploracionFields | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  for (const candidate of [trimmed]) {
    try {
      const parsed = normalizeJsonKeys(parseStructuredOutput(candidate), mode)
      const fromJson = validateStructuredPayload(mode, parsed)
      if (fromJson) return fromJson
    } catch {
      // try markdown
    }

    const fromMarkdown = parseStructuredMarkdownSections(candidate, mode)
    if (fromMarkdown) {
      const validated = validateStructuredPayload(mode, fromMarkdown)
      if (validated) return validated
    }
  }

  return null
}
