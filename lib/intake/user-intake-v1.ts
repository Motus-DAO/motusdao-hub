import type { OnboardingData } from '@/lib/onboarding-store'

export type UsuarioIntakeTrack = 'platform' | 'therapy'

export const PLATFORM_USE_CASES = [
  { value: 'mns', label: 'Motus Name Service (.motus)' },
  { value: 'payments', label: 'Enviar y recibir pagos' },
  { value: 'hub', label: 'Explorar el Hub y la comunidad' },
  { value: 'courses', label: 'Cursos y contenido de bienestar' },
  { value: 'other', label: 'Otro' },
] as const

export function isPlatformIntakeComplete(data: Partial<OnboardingData>): boolean {
  return !!(
    data.nombre &&
    data.apellido &&
    data.telefono &&
    data.fechaNacimiento &&
    data.ciudad &&
    data.pais &&
    data.platformUseCases &&
    data.platformUseCases.length > 0
  )
}

export function isTherapyIntakeComplete(data: Partial<OnboardingData>): boolean {
  return !!(
    data.nombre &&
    data.apellido &&
    data.telefono &&
    data.fechaNacimiento &&
    data.ciudad &&
    data.pais &&
    data.problematica &&
    data.preferenciaAsignacion &&
    data.consentToShareWithPSM &&
    data.consentToClinicalMatching
  )
}

export function isUsuarioIntakeComplete(
  track: UsuarioIntakeTrack | null | undefined,
  data: Partial<OnboardingData>
): boolean {
  if (track === 'platform') return isPlatformIntakeComplete(data)
  return isTherapyIntakeComplete(data)
}
