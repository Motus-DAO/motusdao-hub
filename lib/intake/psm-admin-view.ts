import type { OnboardingData } from '@/lib/onboarding-store'
import { asJsonObject, asStringArray } from '@/lib/prisma-json'
import { resolveWeeklyTherapyHours } from '@/lib/intake/psm-intake-v1'
import {
  PSM_LEGAL_DECLARATION_KEYS,
  resolveClinicalComplexityLevels,
  resolveCountriesWhereCanReceivePatients,
  resolveCredentialedCountries,
  resolveEmergencyProtocolStatus,
  resolveExcludedCases,
  resolveLegalDeclarations,
  resolveServiceTypes,
  type PsmLegalDeclarationKey,
} from '@/lib/intake/psm-operations-compat'

export type PsmProfileAdminSlice = {
  licensedCountries?: unknown
  licensedRegions?: unknown
  exclusionCriteria?: unknown
  worksWithUrgencyLevels?: unknown
  availability?: unknown
  timezone?: string | null
  therapyStyles?: unknown
  languages?: unknown
  maxActivePatients?: number | null
  acceptsSlidingScale?: boolean | null
  professionalNarrative?: string | null
  biografia?: string | null
}

export type PsmAdminOperationsView = {
  timezone: string | null
  weeklyTherapyHours: number | null
  maxActivePatients: number
  credentialedCountries: string[]
  countriesWhereCanReceivePatients: string[]
  serviceTypes: string[]
  clinicalComplexityLevels: string[]
  excludedCases: string[]
  emergencyProtocolStatus: string | null
  legalDeclarations: Partial<Record<PsmLegalDeclarationKey, boolean>>
  legalDeclarationsComplete: boolean
  therapyStyles: string[]
  languages: string[]
  acceptsSlidingScale: boolean
  professionalNarrative: string | null
  requiresCrossBorderReview: boolean
  legacyAvailabilityNotes: string | null
}

function toOnboardingSlice(profile: PsmProfileAdminSlice): Partial<OnboardingData> {
  const availability = asJsonObject(profile.availability)
  const weeklyTherapyHours =
    typeof availability.weeklyTherapyHours === 'number'
      ? availability.weeklyTherapyHours
      : undefined

  return {
    licensedCountries: asStringArray(profile.licensedCountries),
    licensedRegions: asStringArray(profile.licensedRegions),
    exclusionCriteria: asStringArray(profile.exclusionCriteria),
    worksWithUrgencyLevels: asStringArray(profile.worksWithUrgencyLevels) as OnboardingData['worksWithUrgencyLevels'],
    availability,
    weeklyTherapyHours,
    serviceTypes: Array.isArray(availability.serviceTypes)
      ? (availability.serviceTypes as string[])
      : undefined,
    clinicalComplexityLevels: Array.isArray(availability.clinicalComplexityLevels)
      ? (availability.clinicalComplexityLevels as string[])
      : undefined,
    excludedCases: Array.isArray(availability.excludedCases)
      ? (availability.excludedCases as string[])
      : undefined,
    emergencyProtocolStatus:
      typeof availability.emergencyProtocolStatus === 'string'
        ? (availability.emergencyProtocolStatus as OnboardingData['emergencyProtocolStatus'])
        : undefined,
    legalDeclarations:
      typeof availability.legalDeclarations === 'object' && availability.legalDeclarations !== null
        ? (availability.legalDeclarations as OnboardingData['legalDeclarations'])
        : undefined,
  }
}

export function buildPsmAdminOperationsView(
  profile: PsmProfileAdminSlice | null | undefined
): PsmAdminOperationsView {
  if (!profile) {
    return {
      timezone: null,
      weeklyTherapyHours: null,
      maxActivePatients: 10,
      credentialedCountries: [],
      countriesWhereCanReceivePatients: [],
      serviceTypes: [],
      clinicalComplexityLevels: [],
      excludedCases: [],
      emergencyProtocolStatus: null,
      legalDeclarations: {},
      legalDeclarationsComplete: false,
      therapyStyles: [],
      languages: [],
      acceptsSlidingScale: false,
      professionalNarrative: null,
      requiresCrossBorderReview: false,
      legacyAvailabilityNotes: null,
    }
  }

  const data = toOnboardingSlice(profile)
  const availability = asJsonObject(profile.availability)
  const credentialedCountries = resolveCredentialedCountries(data)
  const countriesWhereCanReceivePatients = resolveCountriesWhereCanReceivePatients(data)
  const credentialedSet = new Set(credentialedCountries)
  const legalDeclarations = resolveLegalDeclarations(data)

  return {
    timezone: profile.timezone ?? null,
    weeklyTherapyHours: resolveWeeklyTherapyHours(data) ?? null,
    maxActivePatients: profile.maxActivePatients ?? 10,
    credentialedCountries,
    countriesWhereCanReceivePatients,
    serviceTypes: resolveServiceTypes(data),
    clinicalComplexityLevels: resolveClinicalComplexityLevels(data),
    excludedCases: resolveExcludedCases(data),
    emergencyProtocolStatus: resolveEmergencyProtocolStatus(data) ?? null,
    legalDeclarations,
    legalDeclarationsComplete: PSM_LEGAL_DECLARATION_KEYS.every(
      (key) => legalDeclarations[key] === true
    ),
    therapyStyles: asStringArray(profile.therapyStyles),
    languages: asStringArray(profile.languages),
    acceptsSlidingScale: profile.acceptsSlidingScale ?? false,
    professionalNarrative: profile.professionalNarrative || profile.biografia || null,
    requiresCrossBorderReview: countriesWhereCanReceivePatients.some(
      (country) => !credentialedSet.has(country)
    ),
    legacyAvailabilityNotes:
      typeof availability.notes === 'string' && availability.notes.trim().length > 0
        ? availability.notes.trim()
        : null,
  }
}
