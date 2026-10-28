# Chat-data slice 4 — Training copy consent — Spec

> Status: **READY FOR QA** · Plan: [SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §2.3 · Roadmap: [chat-data-roadmap.md](./chat-data-roadmap.md).

Deliver: separate consent UI, readable copy collection, compensation recorded (0/5/10 USD); refusal does not change care.

Non-goals: training on ciphertext; implied consent from Psychat or bitácora; automatic Stripe payout.

---

## 1. Scope

- Prisma: `consentToTrainingCopy`, `TrainingCopyContribution`, `ClinicalResource.training_copy` (migration `20261028235000_training_copy_consent`).
- Lib: `lib/training-copy/*`, `lib/consent/copy-previous-flags.ts`.
- API: `/api/consent/training-copy`, `/api/training-copy`, `/api/training-copy/[id]`.
- UI: `/contribuir-entrenamiento`; links from Psychat archive / inference help.
- Docs: [docs/architecture/training-copy-consent.md](../docs/architecture/training-copy-consent.md).

## 2. Acceptance criteria

1. **Given** user without `consentToPrivacy`, **when** POST training copy or enable consent, **then** 403.
2. **Given** user submits copy without all notice checkboxes, **when** POST, **then** 400.
3. **Given** valid POST, **when** saved, **then** plaintext row exists; `consentToTrainingCopy` true on new consent record; audit `training_copy.submit`.
4. **Given** active contribution, **when** DELETE, **then** `revokedAt` set; audit `training_copy.revoke`.
5. **Given** POST consent `enabled: false`, **when** saved, **then** active contributions revoked.
6. **Given** user only uses Psychat/archive, **then** no training row without visiting training flow.

## 3. QA gate

- [ ] `npx tsx --test lib/training-copy/compensation.test.ts`
- [ ] `npx prisma migrate deploy`
- [ ] `npx tsc --noEmit`
- [ ] `CI=true npm run build`

## 4. Exit

Next: slice 5 RootRouter + enclaves.
