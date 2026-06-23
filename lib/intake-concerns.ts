export const concernOptions = [
  { value: 'ansiedad', label: 'Ansiedad' },
  { value: 'depresion', label: 'Depresión' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'pareja', label: 'Pareja' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'alimentarios', label: 'Trastornos alimentarios' },
  { value: 'adicciones', label: 'Adicciones' },
  { value: 'duelo', label: 'Duelo' },
  { value: 'autoestima', label: 'Autoestima' },
  { value: 'estres', label: 'Estrés' },
  { value: 'otros', label: 'Otros' },
] as const

const concernKeywords: Record<string, string[]> = {
  ansiedad: ['ansiedad', 'ansioso', 'ansiosa', 'panico', 'pánico', 'preocupacion', 'preocupación'],
  depresion: ['depresion', 'depresión', 'tristeza', 'desanimo', 'desánimo'],
  trauma: ['trauma', 'traumatico', 'traumático', 'abuso', 'violencia'],
  pareja: ['pareja', 'relacion', 'relación', 'novio', 'novia', 'matrimonio'],
  familiar: ['familia', 'familiar', 'padres', 'hijos', 'hermanos'],
  alimentarios: ['comida', 'alimentacion', 'alimentación', 'bulimia', 'anorexia'],
  adicciones: ['adiccion', 'adicción', 'sustancias', 'alcohol', 'drogas'],
  duelo: ['duelo', 'perdida', 'pérdida', 'fallecio', 'falleció', 'muerte'],
  autoestima: ['autoestima', 'valor', 'inseguridad'],
  estres: ['estres', 'estrés', 'burnout', 'agotamiento', 'trabajo'],
}

export function normalizeConcernList(value: unknown): string[] {
  const valid = new Set<string>(concernOptions.map(option => option.value))
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  return [...new Set(
    values
      .map(item => String(item).trim().toLowerCase())
      .filter(item => valid.has(item))
  )]
}

export function inferConcernsFromNarrative(narrative?: string | null): string[] {
  const text = (narrative || '').toLowerCase()
  if (!text.trim()) return []

  const matches = Object.entries(concernKeywords)
    .filter(([, keywords]) => keywords.some(keyword => text.includes(keyword)))
    .map(([concern]) => concern)

  return matches.length > 0 ? matches : ['otros']
}

export function deriveConcernFields(input: {
  tipoAtencion?: string | null
  clinicalConcern?: unknown
  problematica?: string | null
}): {
  tipoAtencion: string
  clinicalConcern: string[]
} {
  const fromClinicalConcern = normalizeConcernList(input.clinicalConcern)
  const fromTipo = normalizeConcernList(input.tipoAtencion)
  const inferred = inferConcernsFromNarrative(input.problematica)
  const clinicalConcern =
    fromClinicalConcern.length > 0
      ? fromClinicalConcern
      : fromTipo.length > 0
        ? fromTipo
        : inferred

  return {
    tipoAtencion: clinicalConcern[0] ?? 'otros',
    clinicalConcern: clinicalConcern.length > 0 ? clinicalConcern : ['otros'],
  }
}
