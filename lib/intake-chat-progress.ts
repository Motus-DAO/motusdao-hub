import type { UserRole } from '@/lib/onboarding-store'

export const USUARIO_FIELD_ORDER = [
  'nombre',
  'apellido',
  'telefono',
  'fechaNacimiento',
  'ciudad',
  'pais',
  'problematica',
  'clinicalConcern',
  'preferenciaAsignacion',
  'urgencyLevel',
  'preferredModality',
  'languages',
  'availabilityNotes',
  'preferredTherapyStyle',
  'consentToAIProcessing',
  'consentToShareWithPSM',
  'consentToClinicalMatching',
] as const

export const PSM_FIELD_ORDER = [
  'nombre',
  'apellido',
  'telefono',
  'fechaNacimiento',
  'ciudad',
  'pais',
  'cedulaProfesional',
  'formacionAcademica',
  'experienciaAnios',
  'especialidades',
  'therapyStyles',
  'languages',
  'modalities',
  'sessionPrice',
  'currency',
  'availabilityNotes',
  'worksWithUrgencyLevels',
  'maxActivePatients',
  'cedulaDocumentPath',
  'tituloDocumentPath',
] as const

const QUESTION_LABELS: Record<UserRole, Record<number, string>> = {
  usuario: {
    1: 'Sobre ti y tu motivo de consulta',
    2: 'Preferencias de atención',
    3: 'Consentimientos y detalles',
  },
  psm: {
    1: 'Datos personales y credenciales',
    2: 'Práctica clínica y modalidades',
    3: 'Capacidad y documentación',
  },
}

const FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre',
  apellido: 'Apellidos',
  telefono: 'Teléfono',
  fechaNacimiento: 'Fecha de nacimiento',
  ciudad: 'Ciudad',
  pais: 'País',
  clinicalConcern: 'Áreas relacionadas',
  tipoAtencion: 'Área principal',
  problematica: 'Motivo de consulta',
  preferenciaAsignacion: 'Asignación',
  urgencyLevel: 'Urgencia',
  preferredModality: 'Modalidad',
  languages: 'Idiomas',
  availabilityNotes: 'Disponibilidad',
  preferredTherapyStyle: 'Enfoque terapéutico',
  consentToAIProcessing: 'Consentimiento IA',
  consentToShareWithPSM: 'Compartir con profesional',
  consentToClinicalMatching: 'Matching clínico',
  cedulaProfesional: 'Cédula profesional',
  formacionAcademica: 'Formación',
  experienciaAnios: 'Años de experiencia',
  especialidades: 'Especialidades',
  therapyStyles: 'Enfoques',
  modalities: 'Modalidades',
  sessionPrice: 'Precio por sesión',
  currency: 'Moneda',
  worksWithUrgencyLevels: 'Niveles de urgencia',
  maxActivePatients: 'Capacidad de pacientes',
  cedulaDocumentPath: 'Doc. cédula',
  tituloDocumentPath: 'Doc. título',
}

export function getFieldOrder(role: UserRole): readonly string[] {
  return role === 'usuario' ? USUARIO_FIELD_ORDER : PSM_FIELD_ORDER
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key
}

function isFilled(captured: Record<string, unknown> | null | undefined, key: string): boolean {
  const value = captured?.[key]
  if (value == null) return false
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return !Number.isNaN(value)
  return String(value).trim().length > 0
}

export function computeFieldProgress(
  role: UserRole,
  captured: Record<string, unknown> | null | undefined
): {
  filledCount: number
  total: number
  nextFieldKey: string | null
  nextFieldLabel: string | null
  filledKeys: string[]
} {
  const order = getFieldOrder(role)
  const filledKeys: string[] = []

  for (const key of order) {
    if (isFilled(captured, key)) filledKeys.push(key)
  }

  const nextFieldKey = order.find((key) => !isFilled(captured, key)) ?? null

  return {
    filledCount: filledKeys.length,
    total: order.length,
    nextFieldKey,
    nextFieldLabel: nextFieldKey ? fieldLabel(nextFieldKey) : null,
    filledKeys,
  }
}

export function computeThreeQuestionStep(
  role: UserRole,
  phase: string | null | undefined,
  questionIndex?: number | null
): {
  displayStep: number
  total: number
  label: string
  handoffReady: boolean
} {
  const p = (phase || 'intake_q1').toLowerCase()

  if (p === 'handoff_ready') {
    return {
      displayStep: 3,
      total: 3,
      label: 'Perfil completo — listo para continuar',
      handoffReady: true,
    }
  }

  let q =
    typeof questionIndex === 'number' && questionIndex >= 1 && questionIndex <= 3
      ? questionIndex
      : null

  if (q == null) {
    if (p === 'intake_q2') q = 2
    else if (p === 'intake_q3') q = 3
    else q = 1
  }

  return {
    displayStep: q,
    total: 3,
    label: QUESTION_LABELS[role][q] ?? `Pregunta ${q}`,
    handoffReady: false,
  }
}
