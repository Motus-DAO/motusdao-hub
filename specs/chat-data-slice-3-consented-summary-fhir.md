# Chat-data slice 3 — Consented summary + FHIR — Spec

> Status: **SHIPPED** @ `7b5577a` · Plan: [SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §4 exit 2 + §5 · Roadmap: [chat-data-roadmap.md](./chat-data-roadmap.md).

Deliver: user-authored summary text; FHIR `DocumentReference` envelope; minimal **therapist-readable** store for active match; revoke; not expediente.

Non-goals: NOM-004 expediente; SMART on FHIR; auto-share bitácora/Psychat; encrypted-only body in this slice (plaintext summary for PSM read).

---

## 1. Scope

- Prisma: `ConsentedClinicalSummary`, `ClinicalResource.consented_summary` (migration `20261028230000_consented_clinical_summary`).
- FHIR: `lib/fhir/document-reference.ts` + tests.
- API: `/api/clinical-summary`, `/api/clinical-summary/[id]`, `/api/clinical-summary/patient/[userId]`.
- Consent gate: latest `consentToShareWithPSM` + active match.
- UI: `/compartir-resumen`, perfil links, `PatientSharedSummariesPanel` for PSM.
- Docs: [docs/architecture/consented-summary-fhir.md](../docs/architecture/consented-summary-fhir.md).

## 2. Acceptance criteria

1. **Given** patient without `consentToShareWithPSM`, **when** POST summary, **then** 403.
2. **Given** patient with consent but no active match, **when** POST, **then** 403.
3. **Given** valid POST with confirmation checkbox, **when** saved, **then** PSM on active match can GET plaintext summary; audit log written.
4. **Given** summary row, **then** `fhirDocumentReference.resourceType` is `DocumentReference` with `patient-consented-summary` type and base64 body.
5. **Given** patient DELETE, **when** revoke, **then** PSM no longer sees row (`revokedAt` set).
6. **Given** unrelated PSM or user, **when** GET patient summaries, **then** 403.

## 3. QA gate

- [x] `npx tsx --test lib/fhir/document-reference.test.ts`
- [ ] `npx prisma migrate deploy` (run in target env)
- [x] `npx tsc --noEmit`

## 4. Exit

Next: slice 4 training copy consent.
