import type { PSMProfile, Profile, User } from '@prisma/client'
import { createSignedPsmIntroVideoUrl } from '@/lib/storage'
import { isStorageMediaRef, fromStorageRef } from '@/lib/academy/media'
import {
  PLATFORM_SESSION_CURRENCY,
  PLATFORM_SESSION_PRICE_USD,
} from '@/lib/constants'
import {
  getEspecialidadLabel,
  getExcludedCaseLabel,
  getPaisLabel,
  getTherapyStyleLabel,
} from '@/lib/intake/psm-intake-options'
import { asStringArray } from '@/lib/prisma-json'
import { computeReputationSummary } from '@/lib/psm/reputation'

export type PsmWithProfile = User & {
  profile: Profile | null
  psm: PSMProfile | null
}

export type PublicPsmProfile = {
  slug: string
  psmUserId: string
  nombre: string
  apellido: string
  fullName: string
  avatarUrl: string | null
  tagline: string | null
  licenseCountry: string
  licenseCountryLabel: string
  cedulaProfesionalMasked: string
  experienciaAnios: number
  formacionAcademica: string
  narratives: {
    conQueTrabajo: string
    miEnfoque: string
    sobreMi: string
    primeraSesion: string
  }
  topSpecialties: string[]
  topSpecialtyLabels: string[]
  specialties: string[]
  specialtyLabels: string[]
  therapyStyles: string[]
  therapyStyleLabels: string[]
  languages: string[]
  styleTags: string[]
  exclusionCriteria: string[]
  exclusionCriteriaLabels: string[]
  doesNotWorkWithNote: string | null
  price: { amount: number; currency: string }
  modality: 'video_only'
  reputation: ReturnType<typeof computeReputationSummary>
  introVideoUrl: string | null
  verificationBadge: boolean
  isAcceptingPatients: boolean
  capacityAvailable: number
}

export const PUBLIC_PSM_WHERE = {
  role: 'psm' as const,
  registrationCompleted: true,
  onboardingStatus: 'active' as const,
  deletedAt: null,
  psm: {
    is: {
      verificationStatus: 'approved' as const,
      isAcceptingPatients: true,
      introVideoApproved: true,
      slug: { not: null },
    },
  },
}

export function maskCedula(cedula: string): string {
  if (cedula.length <= 4) return '****'
  return `****${cedula.slice(-4)}`
}

export function resolveLicenseCountry(
  psm: PSMProfile,
  profile: Profile | null
): string {
  const licensed = asStringArray(psm.licensedCountries)
  if (licensed.length > 0) return licensed[0]
  return profile?.pais || ''
}

async function resolveIntroVideoUrl(psm: PSMProfile): Promise<string | null> {
  const path =
    psm.introVideoStoragePath ||
    (psm.introVideoUrl && isStorageMediaRef(psm.introVideoUrl)
      ? fromStorageRef(psm.introVideoUrl)
      : null)

  if (path) {
    try {
      return await createSignedPsmIntroVideoUrl(path, 7200)
    } catch {
      return null
    }
  }

  if (psm.introVideoUrl && !isStorageMediaRef(psm.introVideoUrl)) {
    return psm.introVideoUrl
  }

  return null
}

export async function buildPublicPsmProfile(
  user: PsmWithProfile,
  reputationInput: {
    reviewCount: number
    ratingSum: number
  },
  activeMatchCount: number
): Promise<PublicPsmProfile | null> {
  const psm = user.psm
  const profile = user.profile
  if (!psm?.slug) return null

  const specialties = asStringArray(psm.especialidades)
  const topSpecialties = asStringArray(psm.topSpecialties)
  const top =
    topSpecialties.length > 0 ? topSpecialties.slice(0, 3) : specialties.slice(0, 3)
  const therapyStyles = asStringArray(psm.therapyStyles)
  const languages = asStringArray(psm.languages)
  const styleTags = asStringArray(psm.styleTags)
  const exclusionCriteria = asStringArray(psm.exclusionCriteria)
  const licenseCountry = resolveLicenseCountry(psm, profile)
  const maxPatients = psm.maxActivePatients || 10
  const capacityAvailable = Math.max(maxPatients - activeMatchCount, 0)

  const introVideoUrl = await resolveIntroVideoUrl(psm)

  return {
    slug: psm.slug,
    psmUserId: user.id,
    nombre: profile?.nombre || '',
    apellido: profile?.apellido || '',
    fullName: `${profile?.nombre || ''} ${profile?.apellido || ''}`.trim(),
    avatarUrl: profile?.avatarUrl || null,
    tagline: psm.tagline,
    licenseCountry,
    licenseCountryLabel: licenseCountry ? getPaisLabel(licenseCountry) : '',
    cedulaProfesionalMasked: maskCedula(psm.cedulaProfesional),
    experienciaAnios: psm.experienciaAnios,
    formacionAcademica: psm.formacionAcademica,
    narratives: {
      conQueTrabajo: psm.professionalNarrative || psm.biografia || '',
      miEnfoque: psm.biografia || psm.professionalNarrative || '',
      sobreMi: psm.biografia || '',
      primeraSesion:
        psm.firstSessionExpectations ||
        'En la primera sesión nos conoceremos, hablaré de tu situación actual y definiremos juntos objetivos para el proceso. Todo a tu ritmo, en un espacio seguro por videollamada.',
    },
    topSpecialties: top,
    topSpecialtyLabels: top.map(getEspecialidadLabel),
    specialties,
    specialtyLabels: specialties.map(getEspecialidadLabel),
    therapyStyles,
    therapyStyleLabels: therapyStyles.map(getTherapyStyleLabel),
    languages,
    styleTags,
    exclusionCriteria,
    exclusionCriteriaLabels: exclusionCriteria.map(getExcludedCaseLabel),
    doesNotWorkWithNote: psm.doesNotWorkWithNote,
    price: { amount: PLATFORM_SESSION_PRICE_USD, currency: PLATFORM_SESSION_CURRENCY },
    modality: 'video_only',
    reputation: computeReputationSummary({
      reviewCount: reputationInput.reviewCount,
      patientCount: psm.patientCount,
      completedSessions: psm.completedSessionsCount,
      ratingSum: reputationInput.ratingSum,
    }),
    introVideoUrl,
    verificationBadge: psm.verificationStatus === 'approved',
    isAcceptingPatients: psm.isAcceptingPatients,
    capacityAvailable,
  }
}

export async function getPsmReputationStats(psmUserId: string) {
  const reviews = await import('@/lib/prisma').then(({ prisma }) =>
    prisma.review.findMany({
      where: {
        psmId: psmUserId,
        status: 'published',
        courseId: null,
      },
      select: { rating: true },
    })
  )
  return {
    reviewCount: reviews.length,
    ratingSum: reviews.reduce((sum, r) => sum + r.rating, 0),
  }
}
