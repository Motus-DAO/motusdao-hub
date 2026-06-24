/**
 * PsmIntakeV1 — canonical formulario de registro for mental health professionals.
 *
 * FHIR-inspired mapping (lightweight, not full FHIR):
 * - identity      → Practitioner.name, telecom, address
 * - credentials   → Practitioner.qualification
 * - practice      → Practitioner.text (Narrative)
 * - clinicalScope → PractitionerRole.specialty, communication, healthcareService
 * - operations    → PractitionerRole.availableTime, extensions
 */
import { z } from 'zod'
import type { OnboardingData, IntakeSource } from '@/lib/onboarding-store'

export const PSM_INTAKE_VERSION = 'psm_v1' as const
export const PSM_MIN_NARRATIVE_LENGTH = 80

const stringArray = z.array(z.string()).default([])
const modalityEnum = z.enum(['video', 'chat', 'in_person', 'hybrid'])
const urgencyEnum = z.enum(['low', 'medium', 'high', 'crisis'])

/** Block A — identity */
export const psmIdentityFields = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  telefono: z.string().min(1, 'El teléfono es obligatorio'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  ciudad: z.string().min(1, 'La ciudad es obligatoria'),
  pais: z.string().min(1, 'El país es obligatorio'),
  avatarUrl: z.string().optional(),
  avatarStoragePath: z.string().optional(),
})

/** Block B — credentials */
export const psmCredentialsFields = z.object({
  cedulaProfesional: z.string().min(1, 'La cédula profesional es obligatoria'),
  formacionAcademica: z.string().min(1, 'La formación académica es obligatoria'),
  experienciaAnios: z.number().int().min(0, 'Los años de experiencia deben ser 0 o mayor'),
  cedulaDocumentPath: z.string().optional(),
  tituloDocumentPath: z.string().optional(),
})

/** Block C — practice narrative (Practitioner.text) */
export const psmPracticeFields = z.object({
  professionalNarrative: z
    .string()
    .min(
      PSM_MIN_NARRATIVE_LENGTH,
      `Cuéntanos sobre tu práctica con al menos ${PSM_MIN_NARRATIVE_LENGTH} caracteres`
    ),
})

/** Block D — clinical scope */
export const psmClinicalScopeFields = z.object({
  especialidades: z.array(z.string()).min(1, 'Selecciona al menos una especialidad'),
  therapyStyles: z.array(z.string()).min(1, 'Selecciona al menos un enfoque terapéutico'),
  languages: z.array(z.string()).min(1, 'Selecciona al menos un idioma'),
  licensedCountries: z.array(z.string()).min(1, 'Selecciona al menos un país donde puedes atender'),
  licensedRegions: stringArray,
  modalities: z.array(modalityEnum).min(1, 'Selecciona al menos una modalidad'),
  worksWithUrgencyLevels: z.array(urgencyEnum).min(1, 'Selecciona al menos un nivel de urgencia'),
  exclusionCriteria: stringArray,
})

/** Block E — operations */
export const psmOperationsFields = z.object({
  timezone: z.string().min(1, 'La zona horaria es obligatoria'),
  availabilityNotes: z.string().min(3, 'Describe tu disponibilidad'),
  maxActiveUsers: z.number().int().positive('Los usuarios activos deben ser mayor a 0'),
  isAcceptingUsers: z.boolean().default(false),
  acceptsSlidingScale: z.boolean().default(false),
})

/** Block F — platform participation */
export const psmPlatformFields = z.object({
  participaSupervision: z.boolean().default(false),
  participaCursos: z.boolean().default(false),
  participaInvestigacion: z.boolean().default(false),
  participaComunidad: z.boolean().default(false),
})

/** Block G — consents */
export const psmConsentFields = z.object({
  consentToTerms: z.literal(true),
  consentToPrivacy: z.literal(true),
  consentToAIProcessing: z.boolean().default(false),
  consentPolicyVersion: z.string().default('v1'),
  consentLocale: z.string().default('es'),
})

/** Block H — meta */
export const psmMetaFields = z.object({
  email: z.string().email(),
  eoaAddress: z.string().min(1),
  smartWalletAddress: z.string().optional(),
  privyId: z.string().optional(),
  intakeSource: z.enum(['manual', 'ai_assisted', 'hybrid']).default('manual'),
  intakeVersion: z.literal(PSM_INTAKE_VERSION).default(PSM_INTAKE_VERSION),
  motusName: z.string().optional(),
  mnsTxHash: z.string().optional(),
  profileNftTxHash: z.string().optional(),
  profileNftTokenURI: z.string().optional(),
})

/** Full canonical registration form */
export const psmIntakeV1Schema = psmIdentityFields
  .merge(psmCredentialsFields)
  .merge(psmPracticeFields)
  .merge(psmClinicalScopeFields)
  .merge(psmOperationsFields)
  .merge(psmPlatformFields)
  .merge(psmConsentFields)
  .merge(psmMetaFields)
  .superRefine((data, ctx) => {
    if (!data.cedulaDocumentPath && !data.tituloDocumentPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes subir al menos un documento: cédula profesional o título',
        path: ['cedulaDocumentPath'],
      })
    }
  })

export type PsmIntakeV1 = z.infer<typeof psmIntakeV1Schema>

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
  'professionalNarrative',
  'therapyStyles',
  'especialidades',
  'languages',
  'licensedCountries',
  'timezone',
  'availabilityNotes',
  'modalities',
  'worksWithUrgencyLevels',
  'maxActiveUsers',
  'cedulaDocumentPath',
  'tituloDocumentPath',
] as const

export const PSM_FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre',
  apellido: 'Apellidos',
  telefono: 'Teléfono',
  fechaNacimiento: 'Fecha de nacimiento',
  ciudad: 'Ciudad',
  pais: 'País',
  cedulaProfesional: 'Cédula profesional',
  formacionAcademica: 'Formación académica',
  experienciaAnios: 'Años de experiencia',
  professionalNarrative: 'Descripción de tu práctica',
  therapyStyles: 'Enfoque terapéutico',
  especialidades: 'Especialización',
  languages: 'Idiomas',
  licensedCountries: 'Países donde puedes atender',
  licensedRegions: 'Regiones con licencia',
  timezone: 'Zona horaria',
  availabilityNotes: 'Disponibilidad',
  modalities: 'Modalidades',
  worksWithUrgencyLevels: 'Niveles de urgencia',
  maxActiveUsers: 'Usuarios activos',
  exclusionCriteria: 'Casos que no tomas',
  cedulaDocumentPath: 'Documento de cédula',
  tituloDocumentPath: 'Documento de título',
  isAcceptingUsers: 'Disponible para recibir usuarios',
}

export function psmFieldLabel(key: string): string {
  return PSM_FIELD_LABELS[key] ?? key
}

/** Resolve narrative from store (supports legacy biografia). */
export function resolveProfessionalNarrative(data: Partial<OnboardingData>): string {
  return (data.professionalNarrative || data.biografia || '').trim()
}

function isFieldFilled(data: Partial<OnboardingData>, key: string): boolean {
  if (key === 'professionalNarrative') {
    return resolveProfessionalNarrative(data).length >= PSM_MIN_NARRATIVE_LENGTH
  }
  if (key === 'maxActiveUsers') {
    const n = data.maxActiveUsers ?? data.maxActivePatients
    return typeof n === 'number' && n > 0
  }
  if (key === 'cedulaDocumentPath' || key === 'tituloDocumentPath') {
    return Boolean(data.cedulaDocumentPath || data.tituloDocumentPath)
  }

  const value = data[key as keyof OnboardingData]
  if (value == null || value === '') return false
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return !Number.isNaN(value)
  return String(value).trim().length > 0
}

export function computePsmIntakeProgress(data: Partial<OnboardingData>) {
  const filledKeys: string[] = []
  for (const key of PSM_FIELD_ORDER) {
    if (isFieldFilled(data, key)) filledKeys.push(key)
  }
  const nextFieldKey = PSM_FIELD_ORDER.find((key) => !isFieldFilled(data, key)) ?? null
  return {
    filledCount: filledKeys.length,
    total: PSM_FIELD_ORDER.length,
    nextFieldKey,
    nextFieldLabel: nextFieldKey ? psmFieldLabel(nextFieldKey) : null,
    filledKeys,
    percent: Math.round((filledKeys.length / PSM_FIELD_ORDER.length) * 100),
  }
}

export function getPsmMissingFieldKeys(data: Partial<OnboardingData>): string[] {
  return PSM_FIELD_ORDER.filter((key) => !isFieldFilled(data, key))
}

export function getPsmMissingFieldLabels(data: Partial<OnboardingData>): string[] {
  return getPsmMissingFieldKeys(data).map(psmFieldLabel)
}

const PSM_FIELD_HINTS: Record<string, string> = {
  nombre: 'Escribe tu nombre.',
  apellido: 'Escribe tus apellidos.',
  telefono: 'Agrega un teléfono de contacto válido.',
  fechaNacimiento: 'Selecciona tu fecha de nacimiento.',
  ciudad: 'Indica la ciudad donde ejerces o vives.',
  pais: 'Selecciona tu país.',
  cedulaProfesional: 'Ingresa tu número de cédula profesional.',
  formacionAcademica: 'Describe tu formación académica (título y universidad).',
  experienciaAnios: 'Indica tus años de experiencia (0 si estás empezando).',
  professionalNarrative:
    'Cuéntanos con tus palabras cómo trabajas, con quién te especializas y qué acompañamiento ofreces.',
  therapyStyles: 'Selecciona un enfoque arriba o escríbelo en el campo abierto (cómo trabajas).',
  especialidades: 'Indica en qué temas o poblaciones te especializas, arriba o en el campo abierto.',
  languages: 'Indica al menos un idioma en el que atiendes.',
  licensedCountries: 'Marca los países donde puedes atender legalmente.',
  timezone: 'Confirma tu zona horaria (ej. America/Mexico_City).',
  availabilityNotes: 'Describe tus horarios o disponibilidad habitual.',
  modalities: 'Selecciona al menos una modalidad (video, presencial, etc.).',
  worksWithUrgencyLevels: 'Indica qué niveles de urgencia puedes atender.',
  maxActiveUsers: 'Define cuántos usuarios activos puedes atender a la vez.',
  cedulaDocumentPath: 'Sube tu cédula profesional o título en PDF o imagen.',
  tituloDocumentPath: 'Sube tu cédula profesional o título en PDF o imagen.',
}

export type PsmWizardBlocker = {
  key: string
  label: string
  hint: string
}

export function getPsmIntakeBlockers(data: Partial<OnboardingData>): PsmWizardBlocker[] {
  return mapPsmMissingKeysToBlockers(getPsmMissingFieldKeys(data), data)
}

function mapPsmMissingKeysToBlockers(
  missingKeys: string[],
  data: Partial<OnboardingData>
): PsmWizardBlocker[] {
  return missingKeys.map((key) => {
    if (key === 'professionalNarrative') {
      const len = resolveProfessionalNarrative(data).length
      const remaining = Math.max(0, PSM_MIN_NARRATIVE_LENGTH - len)
      return {
        key,
        label: psmFieldLabel(key),
        hint:
          remaining > 0
            ? `Amplía tu descripción profesional: necesitas al menos ${PSM_MIN_NARRATIVE_LENGTH} caracteres (te faltan ${remaining}).`
            : PSM_FIELD_HINTS.professionalNarrative,
      }
    }

    if (key === 'cedulaDocumentPath' || key === 'tituloDocumentPath') {
      return {
        key: 'cedulaDocumentPath',
        label: 'Documento de verificación',
        hint: PSM_FIELD_HINTS.cedulaDocumentPath,
      }
    }

    return {
      key,
      label: psmFieldLabel(key),
      hint: PSM_FIELD_HINTS[key] ?? `Completa el campo «${psmFieldLabel(key)}».`,
    }
  })
}

export function getPsmWizardStepBlockers(
  step: number,
  data: Partial<OnboardingData>
): PsmWizardBlocker[] {
  const { missingKeys } = validatePsmWizardStep(step, data)
  return mapPsmMissingKeysToBlockers(missingKeys, data)
}

const WIZARD_STEP_FIELDS: Record<number, (keyof OnboardingData | 'professionalNarrative')[]> = {
  0: [
    'nombre',
    'apellido',
    'telefono',
    'fechaNacimiento',
    'ciudad',
    'pais',
    'cedulaProfesional',
    'formacionAcademica',
    'experienciaAnios',
  ],
  1: ['professionalNarrative', 'therapyStyles', 'especialidades', 'languages', 'modalities'],
  2: [
    'licensedCountries',
    'timezone',
    'availabilityNotes',
    'worksWithUrgencyLevels',
    'maxActiveUsers',
  ],
  3: ['cedulaDocumentPath'],
}

export function validatePsmWizardStep(
  step: number,
  data: Partial<OnboardingData>
): { valid: boolean; missingKeys: string[] } {
  const keys = WIZARD_STEP_FIELDS[step] ?? []
  const missingKeys = keys.filter((key) => {
    if (key === 'professionalNarrative') {
      return resolveProfessionalNarrative(data).length < PSM_MIN_NARRATIVE_LENGTH
    }
    if (key === 'maxActiveUsers') {
      const n = data.maxActiveUsers ?? data.maxActivePatients
      return !(typeof n === 'number' && n > 0)
    }
    if (key === 'cedulaDocumentPath') {
      return !data.cedulaDocumentPath && !data.tituloDocumentPath
    }
    return !isFieldFilled(data, key)
  })
  return { valid: missingKeys.length === 0, missingKeys: missingKeys as string[] }
}

export function isPsmIntakeComplete(data: Partial<OnboardingData>): boolean {
  return getPsmMissingFieldKeys(data).length === 0
}

export function buildPsmFormDefaults(data: Partial<OnboardingData>) {
  const browserTz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'America/Mexico_City'

  const therapyStyles = data.therapyStyles?.length ? data.therapyStyles : []
  const especialidades = data.especialidades || []

  const licensedCountries =
    data.licensedCountries && data.licensedCountries.length > 0
      ? data.licensedCountries
      : data.pais
        ? [data.pais]
        : []

  const narrative = resolveProfessionalNarrative(data)

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
    professionalNarrative: narrative,
    especialidades,
    therapyStyles,
    languages: data.languages?.length ? data.languages : ['es'],
    licensedCountries,
    licensedRegions: data.licensedRegions || [],
    timezone: data.timezone || browserTz,
    availabilityNotes: data.availabilityNotes || '',
    modalities: data.modalities?.length ? data.modalities : ['video'],
    worksWithUrgencyLevels: data.worksWithUrgencyLevels?.length
      ? data.worksWithUrgencyLevels
      : ['low', 'medium'],
    exclusionCriteria: data.exclusionCriteria || [],
    maxActiveUsers:
      (data.maxActiveUsers ?? data.maxActivePatients) && (data.maxActiveUsers ?? data.maxActivePatients)! > 0
        ? (data.maxActiveUsers ?? data.maxActivePatients)!
        : 10,
    isAcceptingUsers: data.isAcceptingUsers ?? data.isAcceptingPatients ?? false,
    acceptsSlidingScale: data.acceptsSlidingScale ?? false,
    participaSupervision: data.participaSupervision ?? false,
    participaCursos: data.participaCursos ?? false,
    participaInvestigacion: data.participaInvestigacion ?? false,
    participaComunidad: data.participaComunidad ?? false,
  }
}

export function buildPsmApiPayload(data: Partial<OnboardingData>) {
  const narrative = resolveProfessionalNarrative(data)
  const intakeSource: IntakeSource | 'hybrid' =
    data.intakeSource === 'ai_assisted' ? 'ai_assisted' : data.intakeSource || 'manual'

  return {
    email: data.email!,
    eoaAddress: data.eoaAddress!,
    smartWalletAddress: data.smartWalletAddress,
    privyId: data.privyId,
    intakeSource,
    intakeVersion: PSM_INTAKE_VERSION,
    motusName: data.motusName,
    mnsTxHash: data.mnsTxHash,
    profileNftTxHash: data.profileNftTxHash,
    profileNftTokenURI: data.profileNftTokenURI,

    nombre: data.nombre!,
    apellido: data.apellido!,
    telefono: data.telefono!,
    fechaNacimiento: data.fechaNacimiento!,
    ciudad: data.ciudad!,
    pais: data.pais!,
    avatarUrl: data.avatarUrl,
    avatarStoragePath: data.avatarStoragePath,

    cedulaProfesional: data.cedulaProfesional!,
    cedulaDocumentPath: data.cedulaDocumentPath,
    tituloDocumentPath: data.tituloDocumentPath,
    formacionAcademica: data.formacionAcademica!,
    experienciaAnios: data.experienciaAnios ?? 0,
    professionalNarrative: narrative,
    biografia: narrative,

    especialidades: data.especialidades || [],
    therapyStyles: data.therapyStyles || [],
    languages: data.languages || ['es'],
    licensedCountries: data.licensedCountries || (data.pais ? [data.pais] : []),
    licensedRegions: data.licensedRegions || [],
    timezone: data.timezone,
    availability: data.availability || (data.availabilityNotes ? { notes: data.availabilityNotes } : {}),
    availabilityNotes: data.availabilityNotes,
    modalities: data.modalities || ['video'],
    worksWithUrgencyLevels: data.worksWithUrgencyLevels || ['low', 'medium'],
    exclusionCriteria: data.exclusionCriteria || [],
    isAcceptingPatients: data.isAcceptingUsers ?? data.isAcceptingPatients ?? false,
    maxActivePatients: data.maxActiveUsers ?? data.maxActivePatients ?? 10,
    acceptsSlidingScale: data.acceptsSlidingScale ?? false,
    participaSupervision: data.participaSupervision ?? false,
    participaCursos: data.participaCursos ?? false,
    participaInvestigacion: data.participaInvestigacion ?? false,
    participaComunidad: data.participaComunidad ?? false,

    consentToTerms: true as const,
    consentToPrivacy: true as const,
    consentToAIProcessing: data.consentToAIProcessing ?? false,
    consentToShareWithPSM: false,
    consentToClinicalMatching: false,
    consentPolicyVersion: 'v1',
    consentLocale: 'es',
  }
}
