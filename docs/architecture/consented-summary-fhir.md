# Consented clinical summary + FHIR envelope

Chat-data slice 3 — second portability exit (SDD §4.2, §5).

## Product

- Patient writes a **short summary in their own words** at share time.
- Stored **legible** for the **active matched PSM** only (`consented_clinical_summaries`).
- Wrapped in FHIR R4-style **`DocumentReference`** JSON (`lib/fhir/document-reference.ts`).
- **Not** expediente, not full bitácora/Psychat, not `Condition`/`Observation`.

## FHIR

| Field | Value |
|-------|--------|
| `type.coding.code` | `patient-consented-summary` |
| `meta.tag` | `not-clinical-record`, `patient-authored` |
| `content[0].attachment.data` | base64 UTF-8 plain summary |

Optional export: patient downloads `application/fhir+json` from `/compartir-resumen`.

## API

- `GET/POST /api/clinical-summary` — patient
- `DELETE /api/clinical-summary/[id]` — revoke
- `GET /api/clinical-summary/patient/[userId]` — PSM (`requireMatchedUserAccess`)

Requires `consentToShareWithPSM` on latest consent record + active `Match`.

## UI

- `/compartir-resumen` — patient compose
- `/perfil` — link (patient); PSM sees `PatientSharedSummariesPanel` on match cards
