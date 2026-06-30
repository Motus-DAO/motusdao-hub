/** Shared chip/select options for PSM intake (wizard + live form + AI). */

export const PSM_ESPECIALIDADES = [
  { value: 'ansiedad', label: 'Ansiedad' },
  { value: 'depresion', label: 'Depresión' },
  { value: 'trauma', label: 'Trauma y TEPT' },
  { value: 'pareja', label: 'Terapia de pareja' },
  { value: 'familiar', label: 'Terapia familiar' },
  { value: 'infantil', label: 'Psicología infantil' },
  { value: 'adolescentes', label: 'Psicología adolescente' },
  { value: 'adicciones', label: 'Adicciones' },
  { value: 'duelo', label: 'Duelo y pérdidas' },
  { value: 'autoestima', label: 'Autoestima' },
  { value: 'estres', label: 'Manejo del estrés' },
  { value: 'cognitivo', label: 'Terapia cognitivo-conductual' },
  { value: 'humanista', label: 'Terapia humanista' },
  { value: 'psicoanalisis', label: 'Psicoanálisis' },
  { value: 'sistemica', label: 'Terapia sistémica' },
] as const

export function getEspecialidadLabel(value: string): string {
  const preset = PSM_ESPECIALIDADES.find((item) => item.value === value)
  return preset?.label ?? value
}

export const PSM_THERAPY_STYLES = [
  { value: 'cognitivo', label: 'Cognitivo-conductual' },
  { value: 'humanista', label: 'Humanista' },
  { value: 'psicoanalisis', label: 'Psicoanálisis' },
  { value: 'sistemica', label: 'Sistémica' },
  { value: 'integrativa', label: 'Integrativa' },
] as const

export function getTherapyStyleLabel(value: string): string {
  const preset = PSM_THERAPY_STYLES.find((item) => item.value === value)
  return preset?.label ?? value
}

export const PSM_LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' },
] as const

export const PSM_URGENCY_LEVELS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'crisis', label: 'Crisis' },
] as const

/** @deprecated Use PSM_CLINICAL_COMPLEXITY_LEVELS in operations step */
export const PSM_URGENCY_LEVELS_LEGACY = PSM_URGENCY_LEVELS

export const PSM_CLINICAL_COMPLEXITY_LEVELS = [
  { value: 'low_complexity', label: 'Baja complejidad' },
  { value: 'medium_complexity', label: 'Complejidad media' },
  { value: 'high_with_support', label: 'Alta complejidad con red de apoyo' },
  { value: 'no_active_crisis', label: 'No atiendo crisis activas por plataforma' },
] as const

export function getClinicalComplexityLabel(value: string): string {
  const preset = PSM_CLINICAL_COMPLEXITY_LEVELS.find((item) => item.value === value)
  return preset?.label ?? value
}

export const PSM_SERVICE_TYPES = [
  { value: 'individual_therapy', label: 'Psicoterapia individual' },
  { value: 'psychological_guidance', label: 'Orientación psicológica' },
  { value: 'psychoeducation', label: 'Psicoeducación' },
  { value: 'clinical_supervision', label: 'Supervisión clínica' },
  { value: 'groups_workshops', label: 'Grupos / talleres' },
  { value: 'courses', label: 'Cursos' },
  { value: 'psychological_assessment', label: 'Evaluación psicológica' },
  { value: 'non_clinical_support', label: 'Acompañamiento no clínico' },
  { value: 'research_interviews', label: 'Investigación / entrevistas' },
] as const

export function getServiceTypeLabel(value: string): string {
  const preset = PSM_SERVICE_TYPES.find((item) => item.value === value)
  return preset?.label ?? value
}

export const PSM_EXCLUSION_CRITERIA = [
  { value: 'self_harm_crisis', label: 'Crisis suicida activa' },
  { value: 'active_psychosis', label: 'Psicosis activa' },
  { value: 'substance_detox', label: 'Desintoxicación' },
  { value: 'legal_forensic', label: 'Casos legales / forenses' },
  { value: 'minors', label: 'Menores de edad' },
  { value: 'active_violence_no_support', label: 'Violencia activa sin red de apoyo' },
  { value: 'unstable_medical_psychiatric', label: 'Riesgo médico o psiquiátrico no estabilizado' },
  { value: 'case_by_case_intake', label: 'Definiré caso por caso en entrevista inicial' },
] as const

/** @deprecated alias */
export const PSM_EXCLUDED_CASES = PSM_EXCLUSION_CRITERIA

export function getExcludedCaseLabel(value: string): string {
  const preset = PSM_EXCLUSION_CRITERIA.find((item) => item.value === value)
  return preset?.label ?? value
}

export const PSM_EMERGENCY_PROTOCOL_OPTIONS = [
  { value: 'own_protocol', label: 'Sí, tengo protocolo propio' },
  { value: 'institutional_protocol', label: 'Sí, uso protocolo institucional' },
  { value: 'not_yet', label: 'No todavía' },
  { value: 'want_motus_guidance', label: 'Quiero recibir guía de MotusDAO' },
] as const

export function getEmergencyProtocolLabel(value: string): string {
  const preset = PSM_EMERGENCY_PROTOCOL_OPTIONS.find((item) => item.value === value)
  return preset?.label ?? value
}

export function getPaisLabel(value: string): string {
  const preset = PSM_PAISES.find((item) => item.value === value)
  return preset?.label ?? value
}

export const PSM_LEGAL_DECLARATIONS = [
  {
    key: 'infoIsTrue',
    label: 'Confirmo que la información proporcionada es verdadera y actual.',
  },
  {
    key: 'professionalScope',
    label:
      'Confirmo que soy responsable de ejercer dentro de mi alcance profesional, formación y habilitación legal.',
  },
  {
    key: 'motusCanReview',
    label:
      'Entiendo que MotusDAO puede revisar, aprobar, rechazar o limitar mi perfil profesional.',
  },
  {
    key: 'noPatientGuarantee',
    label:
      'Reconozco que MotusDAO no me trae ni promete pacientes; la visibilidad y posibles derivaciones dependen de la calidad de mi perfil y de las recomendaciones de la plataforma.',
  },
  {
    key: 'notEmergency',
    label: 'Entiendo que MotusDAO no es un servicio de emergencia.',
  },
  {
    key: 'termsPrivacy',
    label: 'Acepto los términos, privacidad y tratamiento de datos de MotusDAO.',
  },
  {
    key: 'documentsReview',
    label: 'Acepto que mis documentos sean revisados por administración.',
  },
  {
    key: 'crossBorderReview',
    label:
      'Entiendo que la atención a usuarios fuera de mi país de habilitación puede requerir revisión adicional.',
  },
] as const

export const PSM_PAISES = [
  { value: 'mexico', label: 'México' },
  { value: 'colombia', label: 'Colombia' },
  { value: 'argentina', label: 'Argentina' },
  { value: 'chile', label: 'Chile' },
  { value: 'peru', label: 'Perú' },
  { value: 'venezuela', label: 'Venezuela' },
  { value: 'ecuador', label: 'Ecuador' },
  { value: 'bolivia', label: 'Bolivia' },
  { value: 'paraguay', label: 'Paraguay' },
  { value: 'uruguay', label: 'Uruguay' },
  { value: 'espana', label: 'España' },
  { value: 'otros', label: 'Otros' },
] as const

export const PSM_WIZARD_STEPS = [
  { id: 0, title: 'Identidad y credenciales', description: 'Datos personales y formación' },
  { id: 1, title: 'Tu práctica', description: 'Enfoque, especialidades y perfil público' },
  { id: 2, title: 'Video de presentación', description: 'Opcional: sube un archivo o pega un enlace' },
  { id: 3, title: 'Operación', description: 'Capacidad, jurisdicción y límites clínicos' },
  { id: 4, title: 'Documentos', description: 'Verificación profesional' },
] as const
