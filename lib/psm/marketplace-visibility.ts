type MarketplaceUserSlice = {
  registrationCompleted: boolean
  onboardingStatus: string
  deletedAt: Date | null
  psm: {
    verificationStatus: string
    isAcceptingPatients: boolean
    introVideoApproved: boolean
    slug: string | null
  } | null
}

export type PsmMarketplaceVisibility = {
  isMarketplaceVisible: boolean
  gaps: string[]
}

/**
 * Why a PSM may appear in /admin/psm but not on /psicoterapia (PUBLIC_PSM_WHERE).
 */
export function getPsmMarketplaceVisibility(
  user: MarketplaceUserSlice
): PsmMarketplaceVisibility {
  const gaps: string[] = []

  if (user.deletedAt) gaps.push('Cuenta eliminada')
  if (!user.registrationCompleted) gaps.push('Registro incompleto')
  if (user.onboardingStatus !== 'active') {
    gaps.push(`Onboarding: ${user.onboardingStatus}`)
  }

  if (!user.psm) {
    gaps.push('Sin perfil PSM')
    return { isMarketplaceVisible: false, gaps }
  }

  if (user.psm.verificationStatus !== 'approved') {
    gaps.push('Verificación no aprobada')
  }
  if (!user.psm.isAcceptingPatients) {
    gaps.push('No acepta pacientes')
  }
  if (!user.psm.slug) {
    gaps.push('Sin slug público')
  }

  return {
    isMarketplaceVisible: gaps.length === 0,
    gaps,
  }
}
