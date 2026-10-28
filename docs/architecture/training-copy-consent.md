# Training copy consent (chat-data slice 4)

Readable text the user **authors on purpose** for model training. Distinct from:

- Psychat inference consent (`consentToAIProcessing`)
- Psychat archive ciphertext (`consentToPsychatArchive`)
- Bitácora wallet package (`motus-safe-notes`)
- Therapist-readable summary (`consented_clinical_summaries`)

## Data model

- `ConsentRecord.consentToTrainingCopy` — third yes; off by default.
- `TrainingCopyContribution` — plaintext `copyText`, optional `compensationUsd` (0 | 5 | 10), `payoutStatus` (`none` | `recorded` | …). Motus-readable by design for the training pipeline.

Migration: `20261028235000_training_copy_consent`.

## APIs

| Route | Role |
|-------|------|
| `GET/POST /api/consent/training-copy` | Read/toggle consent; disabling revokes active rows |
| `GET/POST /api/training-copy` | List/submit with full notice checkboxes |
| `DELETE /api/training-copy/[id]` | Revoke one contribution |

Gates: `consentToPrivacy` before any training consent. Submit requires all confirmation flags in `lib/training-copy/constants.ts`.

## UI

`/contribuir-entrenamiento` — notice, form, compensation radios, revoke.

## Compensation

Stripe payout to wallet is **not** automated in this slice. Amounts are recorded (`payoutStatus: recorded`) for manual fulfillment when the program is active.

## Audit

`ClinicalResource.training_copy` — `training_copy.submit`, `training_copy.revoke`.
