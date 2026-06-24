import type { OnboardingData, UrgencyLevel } from '@/lib/onboarding-store'

/** Countries where the professional holds license / credential (DB: licensedCountries). */
export function resolveCredentialedCountries(data: Partial<OnboardingData>): string[] {
  if (data.credentialedCountries?.length) return data.credentialedCountries
  if (data.licensedCountries?.length && !data.countriesWhereCanReceivePatients?.length) {
    return data.licensedCountries
  }
  return data.pais ? [data.pais] : []
}

/** Countries where the professional declares they can receive patients (DB: licensedRegions). */
export function resolveCountriesWhereCanReceivePatients(data: Partial<OnboardingData>): string[] {
  if (data.countriesWhereCanReceivePatients?.length) return data.countriesWhereCanReceivePatients
  if (data.licensedRegions?.length) return data.licensedRegions
  if (data.licensedCountries?.length) return data.licensedCountries
  return data.pais ? [data.pais] : []
}

export type ClinicalComplexityLevel =
  | 'low_complexity'
  | 'medium_complexity'
  | 'high_with_support'
  | 'no_active_crisis'

const LEGACY_URGENCY_TO_COMPLEXITY: Record<UrgencyLevel, ClinicalComplexityLevel> = {
  low: 'low_complexity',
  medium: 'medium_complexity',
  high: 'high_with_support',
  crisis: 'no_active_crisis',
}

const COMPLEXITY_TO_URGENCY: Partial<Record<ClinicalComplexityLevel, UrgencyLevel>> = {
  low_complexity: 'low',
  medium_complexity: 'medium',
  high_with_support: 'high',
}

export function resolveClinicalComplexityLevels(
  data: Partial<OnboardingData>
): ClinicalComplexityLevel[] {
  const fromStore = data.clinicalComplexityLevels as ClinicalComplexityLevel[] | undefined
  if (fromStore?.length) return fromStore

  const fromAvailability = data.availability?.clinicalComplexityLevels
  if (Array.isArray(fromAvailability) && fromAvailability.length > 0) {
    return fromAvailability as ClinicalComplexityLevel[]
  }

  if (data.worksWithUrgencyLevels?.length) {
    return data.worksWithUrgencyLevels.map(
      (level) => LEGACY_URGENCY_TO_COMPLEXITY[level] ?? 'medium_complexity'
    )
  }

  return []
}

export function mapClinicalComplexityToUrgencyLevels(
  levels: ClinicalComplexityLevel[]
): UrgencyLevel[] {
  const mapped = levels
    .map((level) => COMPLEXITY_TO_URGENCY[level])
    .filter((level): level is UrgencyLevel => Boolean(level))
  return mapped.length > 0 ? [...new Set(mapped)] : ['low', 'medium']
}

export function resolveServiceTypes(data: Partial<OnboardingData>): string[] {
  if (data.serviceTypes?.length) return data.serviceTypes
  const fromAvailability = data.availability?.serviceTypes
  if (Array.isArray(fromAvailability) && fromAvailability.length > 0) {
    return fromAvailability as string[]
  }
  return []
}

export function resolveExcludedCases(data: Partial<OnboardingData>): string[] {
  const raw =
    data.excludedCases?.length
      ? data.excludedCases
      : data.exclusionCriteria?.length
        ? data.exclusionCriteria
        : Array.isArray(data.availability?.excludedCases) &&
            data.availability.excludedCases.length > 0
          ? (data.availability.excludedCases as string[])
          : []
  // Legacy "other" chip — custom cases are stored as free text instead.
  return raw.filter((v) => v !== 'other')
}

export type EmergencyProtocolStatus =
  | 'own_protocol'
  | 'institutional_protocol'
  | 'not_yet'
  | 'want_motus_guidance'

export function resolveEmergencyProtocolStatus(
  data: Partial<OnboardingData>
): EmergencyProtocolStatus | undefined {
  if (data.emergencyProtocolStatus) return data.emergencyProtocolStatus
  const fromAvailability = data.availability?.emergencyProtocolStatus
  if (typeof fromAvailability === 'string') return fromAvailability as EmergencyProtocolStatus
  return undefined
}

export const PSM_LEGAL_DECLARATION_KEYS = [
  'infoIsTrue',
  'professionalScope',
  'motusCanReview',
  'notEmergency',
  'termsPrivacy',
  'documentsReview',
  'crossBorderReview',
] as const

export type PsmLegalDeclarationKey = (typeof PSM_LEGAL_DECLARATION_KEYS)[number]

export type PsmLegalDeclarations = Partial<Record<PsmLegalDeclarationKey, boolean>>

export function resolveLegalDeclarations(data: Partial<OnboardingData>): PsmLegalDeclarations {
  if (data.legalDeclarations) return data.legalDeclarations
  const fromAvailability = data.availability?.legalDeclarations
  if (typeof fromAvailability === 'object' && fromAvailability !== null) {
    return fromAvailability as PsmLegalDeclarations
  }
  return {}
}

export function arePsmLegalDeclarationsComplete(data: Partial<OnboardingData>): boolean {
  const declarations = resolveLegalDeclarations(data)
  return PSM_LEGAL_DECLARATION_KEYS.every((key) => declarations[key] === true)
}
