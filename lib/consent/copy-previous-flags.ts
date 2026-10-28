import type { ConsentRecord } from '@prisma/client'

/** Carry forward boolean consent flags when appending a new ConsentRecord row. */
export function consentFlagsFromPrevious(previous: ConsentRecord | null | undefined) {
  return {
    consentToTerms: previous?.consentToTerms ?? false,
    consentToPrivacy: previous?.consentToPrivacy ?? false,
    consentToAIProcessing: previous?.consentToAIProcessing ?? false,
    consentToShareWithPSM: previous?.consentToShareWithPSM ?? false,
    consentToClinicalMatching: previous?.consentToClinicalMatching ?? false,
    consentToPsychatArchive: previous?.consentToPsychatArchive ?? false,
    consentToTrainingCopy: previous?.consentToTrainingCopy ?? false,
    policyVersion: previous?.policyVersion ?? 'v1',
    locale: previous?.locale ?? 'es',
  }
}
