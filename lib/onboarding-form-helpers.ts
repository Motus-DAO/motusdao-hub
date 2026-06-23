import type { FieldErrors } from 'react-hook-form'
import { cn } from '@/lib/utils'
import type { OnboardingData, Modality, UrgencyLevel } from '@/lib/onboarding-store'

export function inputFieldClass(hasError?: boolean, extra?: string) {
  return cn(
    'w-full px-4 py-3 glass rounded-xl focus-ring smooth-transition',
    hasError
      ? 'border-2 border-red-500/80 ring-2 ring-red-500/25 bg-red-500/5'
      : 'border border-white/15',
    extra
  )
}

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

const PSM_FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre',
  apellido: 'Apellidos',
  telefono: 'Teléfono',
  fechaNacimiento: 'Fecha de nacimiento',
  ciudad: 'Ciudad',
  pais: 'País',
  cedulaProfesional: 'Cédula profesional',
  formacionAcademica: 'Formación académica',
  experienciaAnios: 'Años de experiencia',
  especialidades: 'Especialidades',
  therapyStyles: 'Enfoques terapéuticos',
  languages: 'Idiomas',
  licensedCountries: 'Países donde puedes atender',
  timezone: 'Zona horaria',
  availabilityNotes: 'Disponibilidad',
  modalities: 'Modalidades',
  currency: 'Moneda',
  worksWithUrgencyLevels: 'Niveles de urgencia',
  maxActivePatients: 'Capacidad activa',
  sessionPrice: 'Precio por sesión',
}

export function labelForField(field: string): string {
  const root = field.split('.')[0]
  return PSM_FIELD_LABELS[root] || root
}

export function buildPsmFormValues(data: Partial<OnboardingData>) {
  const browserTz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'America/Mexico_City'

  const especialidades = data.especialidades || []
  const therapyStyles =
    data.therapyStyles && data.therapyStyles.length > 0
      ? data.therapyStyles
      : especialidades.length > 0
        ? [especialidades[0]]
        : []

  const licensedCountries =
    data.licensedCountries && data.licensedCountries.length > 0
      ? data.licensedCountries
      : data.pais
        ? [data.pais]
        : []

  return {
    nombre: data.nombre || '',
    apellido: data.apellido || '',
    telefono: data.telefono || '',
    fechaNacimiento: data.fechaNacimiento || '',
    ciudad: data.ciudad || '',
    pais: data.pais || '',
    cedulaProfesional: data.cedulaProfesional || '',
    formacionAcademica: data.formacionAcademica || '',
    experienciaAnios:
      data.experienciaAnios !== undefined && !Number.isNaN(data.experienciaAnios)
        ? data.experienciaAnios
        : 0,
    biografia: data.biografia || '',
    especialidades,
    therapyStyles,
    languages: data.languages?.length ? data.languages : ['es'],
    licensedCountries,
    licensedRegions: data.licensedRegions || [],
    timezone: data.timezone || browserTz,
    availabilityNotes: data.availabilityNotes || '',
    modalities: (data.modalities?.length ? data.modalities : ['video']) as Modality[],
    sessionPrice: data.sessionPrice,
    currency: data.currency || 'MXN',
    acceptsSlidingScale: data.acceptsSlidingScale ?? false,
    worksWithUrgencyLevels: (data.worksWithUrgencyLevels?.length
      ? data.worksWithUrgencyLevels
      : ['low', 'medium']) as UrgencyLevel[],
    exclusionCriteria: data.exclusionCriteria || [],
    isAcceptingPatients: data.isAcceptingPatients ?? false,
    maxActivePatients:
      data.maxActivePatients && data.maxActivePatients > 0
        ? data.maxActivePatients
        : 10,
    participaSupervision: data.participaSupervision ?? false,
    participaCursos: data.participaCursos ?? false,
    participaInvestigacion: data.participaInvestigacion ?? false,
    participaComunidad: data.participaComunidad ?? false,
  }
}

export function normalizePhone(value: unknown): string {
  return String(value ?? '').replace(/[\s\-().]/g, '')
}
