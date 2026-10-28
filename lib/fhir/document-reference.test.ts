import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildConsentedSummaryDocumentReference,
  parseSummaryFromDocumentReference,
} from './document-reference'

describe('FHIR DocumentReference for consented summary', () => {
  it('builds a DocumentReference with plain text in attachment.data', () => {
    const doc = buildConsentedSummaryDocumentReference({
      summaryId: 'sum_1',
      userId: 'user_abc',
      summaryText: 'Hoy me siento mejor pero sigo con ansiedad en el trabajo.',
      title: 'Check-in semanal',
      createdAt: new Date('2026-10-28T12:00:00.000Z'),
    })
    assert.equal(doc.resourceType, 'DocumentReference')
    assert.equal(doc.status, 'current')
    assert.equal(doc.type.coding[0]?.code, 'patient-consented-summary')
    assert.ok(doc.meta.tag.some((t) => t.code === 'not-clinical-record'))
    const roundTrip = parseSummaryFromDocumentReference(doc)
    assert.equal(roundTrip, 'Hoy me siento mejor pero sigo con ansiedad en el trabajo.')
  })
})
