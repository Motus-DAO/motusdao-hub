import {
  MOTUS_FHIR_DOCUMENT_TYPE_SYSTEM,
  MOTUS_FHIR_TAG_SYSTEM,
  PATIENT_CONSENTED_SUMMARY_CODE,
} from '@/lib/clinical-summary/constants'

export type FhirDocumentReference = {
  resourceType: 'DocumentReference'
  id: string
  status: 'current'
  meta: {
    tag: Array<{ system: string; code: string; display: string }>
  }
  type: {
    coding: Array<{
      system: string
      code: string
      display: string
    }>
  }
  subject: {
    reference: string
    display: string
  }
  date: string
  description?: string
  content: Array<{
    attachment: {
      contentType: string
      data: string
      title?: string
    }
  }>
}

export function buildConsentedSummaryDocumentReference(input: {
  summaryId: string
  userId: string
  summaryText: string
  title?: string | null
  createdAt?: Date
}): FhirDocumentReference {
  const date = (input.createdAt ?? new Date()).toISOString()
  const description =
    input.title?.trim() ||
    input.summaryText.trim().slice(0, 120) + (input.summaryText.length > 120 ? '…' : '')

  return {
    resourceType: 'DocumentReference',
    id: input.summaryId,
    status: 'current',
    meta: {
      tag: [
        {
          system: MOTUS_FHIR_TAG_SYSTEM,
          code: 'not-clinical-record',
          display: 'No es expediente clínico ni nota de psicoterapia',
        },
        {
          system: MOTUS_FHIR_TAG_SYSTEM,
          code: 'patient-authored',
          display: 'Redactado y compartido por la persona',
        },
      ],
    },
    type: {
      coding: [
        {
          system: MOTUS_FHIR_DOCUMENT_TYPE_SYSTEM,
          code: PATIENT_CONSENTED_SUMMARY_CODE,
          display: 'Resumen compartido por la persona (consentido)',
        },
      ],
    },
    subject: {
      reference: `Patient/motus-${input.userId}`,
      display: 'Participante Motus Hub',
    },
    date,
    description,
    content: [
      {
        attachment: {
          contentType: 'text/plain; charset=utf-8',
          data: Buffer.from(input.summaryText, 'utf8').toString('base64'),
          title: input.title ?? 'Resumen compartido',
        },
      },
    ],
  }
}

export function parseSummaryFromDocumentReference(doc: FhirDocumentReference): string | null {
  const data = doc.content?.[0]?.attachment?.data
  if (!data) return null
  try {
    return Buffer.from(data, 'base64').toString('utf8')
  } catch {
    return null
  }
}
