export interface FormacionAcademicaParts {
  tituloProfesional: string
  universidad: string
  posgrado?: string
}

/** Compose canonical `formacionAcademica` string for API / DB. */
export function composeFormacionAcademica(parts: FormacionAcademicaParts): string {
  const titulo = parts.tituloProfesional.trim()
  const universidad = parts.universidad.trim()
  const posgrado = parts.posgrado?.trim() ?? ''

  if (!titulo && !universidad) return ''

  const base = universidad ? `${titulo}, ${universidad}` : titulo
  return posgrado ? `${base}. ${posgrado}` : base
}

/**
 * Best-effort parse for returning users or AI-filled legacy strings.
 * New entries should use structured fields in the form.
 */
export function parseFormacionAcademica(value: string | undefined): FormacionAcademicaParts {
  const raw = (value ?? '').trim()
  if (!raw) {
    return { tituloProfesional: '', universidad: '', posgrado: '' }
  }

  const posgradoMatch = raw.match(
    /\.\s+(Maestr[ií]a|Doctorado|Especialidad|Diplomado|Posgrado).+$/i
  )
  const posgrado = posgradoMatch ? posgradoMatch[0].replace(/^\.\s+/, '').trim() : ''
  const main = posgradoMatch ? raw.slice(0, posgradoMatch.index).trim() : raw

  const commaIdx = main.indexOf(',')
  if (commaIdx === -1) {
    return { tituloProfesional: main, universidad: '', posgrado }
  }

  return {
    tituloProfesional: main.slice(0, commaIdx).trim(),
    universidad: main.slice(commaIdx + 1).trim(),
    posgrado,
  }
}

export function isFormacionAcademicaComplete(parts: FormacionAcademicaParts): boolean {
  return Boolean(parts.tituloProfesional.trim() && parts.universidad.trim())
}
