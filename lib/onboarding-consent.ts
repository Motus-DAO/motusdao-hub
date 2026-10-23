export type OnboardingConsentInput = {
  consentToTerms: boolean
  consentToPrivacy: boolean
  consentToShareWithPSM: boolean
  consentToClinicalMatching: boolean
}

/** Patient care signup. Platform signup does not require the two clinical yeses. */
export function userConsentRejection(
  input: OnboardingConsentInput & { intakeTrack: 'platform' | 'therapy' }
) {
  if (input.consentToTerms !== true || input.consentToPrivacy !== true) {
    return 'Faltan los consentimientos de términos y privacidad.'
  }
  if (
    input.intakeTrack === 'therapy' &&
    (input.consentToShareWithPSM !== true || input.consentToClinicalMatching !== true)
  ) {
    return 'Faltan los consentimientos para compartir el perfil y el matching.'
  }
  return null
}

/** Psychologist signup. Sharing and matching stay the patient's consents. */
export function psmConsentRejection(input: Pick<OnboardingConsentInput, 'consentToTerms' | 'consentToPrivacy'>) {
  if (input.consentToTerms !== true || input.consentToPrivacy !== true) {
    return 'Faltan los consentimientos de términos y privacidad.'
  }
  return null
}
