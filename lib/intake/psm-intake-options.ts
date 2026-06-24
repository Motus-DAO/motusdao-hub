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

export const PSM_EXCLUSION_CRITERIA = [
  { value: 'self_harm_crisis', label: 'Crisis suicida activa' },
  { value: 'active_psychosis', label: 'Psicosis activa' },
  { value: 'substance_detox', label: 'Desintoxicación' },
  { value: 'legal_forensic', label: 'Casos legales/forenses' },
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
  { id: 1, title: 'Tu práctica', description: 'Enfoque y áreas de trabajo' },
  { id: 2, title: 'Operación', description: 'Disponibilidad y capacidad' },
  { id: 3, title: 'Documentos', description: 'Verificación profesional' },
] as const
