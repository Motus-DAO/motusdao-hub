export const BITACORA_ENTRY_KINDS = [
  'nota',
  'emocional',
  'secreto',
  'reflexion',
  'sesion',
  'idea',
] as const

export type BitacoraEntryKind = (typeof BITACORA_ENTRY_KINDS)[number]

export type BitacoraEntryKindMeta = {
  label: string
  description: string
  contentLabel: string
  contentPlaceholder: string
  showMood: boolean
  /** Tailwind chip colors */
  chipClass: string
}

export const BITACORA_ENTRY_KIND_META: Record<BitacoraEntryKind, BitacoraEntryKindMeta> = {
  nota: {
    label: 'Nota libre',
    description: 'Texto general: listas, apuntes, lo que quieras.',
    contentLabel: 'Contenido',
    contentPlaceholder:
      'Escribe aquí… Markdown: **negrita**, listas con -, ## subtítulos',
    showMood: false,
    chipClass: 'bg-slate-500/20 text-slate-300',
  },
  emocional: {
    label: 'Registro emocional',
    description: 'Cómo te sientes y qué pasó — para revisar patrones después.',
    contentLabel: '¿Qué quieres registrar?',
    contentPlaceholder:
      'Describe tu día, pensamientos o emociones… Puedes usar Markdown.',
    showMood: true,
    chipClass: 'bg-pink-500/20 text-pink-300',
  },
  secreto: {
    label: 'Secreto / acceso',
    description: 'Datos sensibles (accesos, claves, PIN). Sigue cifrado; no es gestor con autofill.',
    contentLabel: 'Información cifrada',
    contentPlaceholder:
      'Ej.: servicio, usuario, notas… Todo queda dentro del cifrado con tu wallet.',
    showMood: false,
    chipClass: 'bg-amber-500/20 text-amber-300',
  },
  reflexion: {
    label: 'Reflexión',
    description: 'Procesar experiencias, aprendizajes o decisiones.',
    contentLabel: 'Reflexión',
    contentPlaceholder: '¿Qué aprendiste? ¿Qué quieres recordar?',
    showMood: false,
    chipClass: 'bg-violet-500/20 text-violet-300',
  },
  sesion: {
    label: 'Notas de sesión',
    description: 'Apuntes privados entre sesiones (usuario o profesional). No sustituye expediente clínico.',
    contentLabel: 'Notas',
    contentPlaceholder:
      'Temas a retomar, tareas, observaciones para ti… Markdown permitido.',
    showMood: false,
    chipClass: 'bg-cyan-500/20 text-cyan-300',
  },
  idea: {
    label: 'Idea o proyecto',
    description: 'Bocetos, planes, hipótesis — sin presión de formato.',
    contentLabel: 'Idea',
    contentPlaceholder: 'Captura la idea antes de que se vaya…',
    showMood: false,
    chipClass: 'bg-emerald-500/20 text-emerald-300',
  },
}

export function isBitacoraEntryKind(value: unknown): value is BitacoraEntryKind {
  return typeof value === 'string' && (BITACORA_ENTRY_KINDS as readonly string[]).includes(value)
}

/** Older rows had no `kind`; infer from mood when possible. */
export function inferLegacyBitacoraKind(mood: string): BitacoraEntryKind {
  if (mood && mood !== 'neutral') return 'emocional'
  return 'nota'
}

export function normalizeBitacoraKind(
  raw: unknown,
  mood: string
): BitacoraEntryKind {
  if (isBitacoraEntryKind(raw)) return raw
  return inferLegacyBitacoraKind(mood)
}

export function entryKindShowsMood(kind: BitacoraEntryKind): boolean {
  return BITACORA_ENTRY_KIND_META[kind].showMood
}

export function entryListTitle(entry: {
  kind: BitacoraEntryKind
  title?: string
  content: string
}): string {
  const trimmed = entry.title?.trim()
  if (trimmed) return trimmed
  const firstLine = entry.content.split('\n').find((l) => l.trim())?.trim()
  if (!firstLine) return BITACORA_ENTRY_KIND_META[entry.kind].label
  const plain = firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '')
  return plain.length > 72 ? `${plain.slice(0, 72)}…` : plain
}
