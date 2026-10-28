# Safety slice 3 — Onboarding writes require the wallet — Spec

> Status: **SHIPPED** on `main` at `92789f4` · Owner: product · 27 Oct 2026
>
> Purpose: a user or psychologist row is created only for the wallet that signed the SIWE session, and a consent is stored as yes only when the person marked it.
>
> Plan: [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md) slice 3. The plan's exit looks for this file. The code is the source.
>
> User alta: `27ac4c7`. PSM alta + review payload: `92789f4`.

---

## 1. Scope (what this slice delivers)

- `POST /api/onboarding/user` and `POST /api/onboarding/psm` call `requireSession` before any write. No session is 401.
- The body's `eoaAddress` must match `session.eoaAddress`. A mismatch is 403 and no row is written.
- `consentToTerms`, `consentToPrivacy`, `consentToShareWithPSM`, `consentToClinicalMatching`, and `consentToAIProcessing` default to `false` when the field is omitted.
- Terms and privacy must be `true` or the write is 400 (`userConsentRejection` / `psmConsentRejection`).
- Therapy signup also requires `consentToShareWithPSM` and `consentToClinicalMatching`. Platform signup does not. Psychologist signup does not. Those two flags are the patient's.
- `consentToAIProcessing` stays optional. Slice 2 is what refuses the model when it is false.
- The review step sends the stored checkbox values. It no longer fills terms, privacy, sharing, or matching with `true`.
- Patient intake UI collects mood, payment preference, and the required consents; assignment preference defaults to `explorar` server-side (not a separate required field).

## 2. Non-goals (explicitly out of scope)

- Slice 4–7 and the later chat-data steps do not start.
- No redesign beyond consent controls and the fields this slice already touched.
- Public therapist pages stay hidden until admin approval.
- Admin hard delete is operational tooling for QA; it is not a safety-plan slice.

## 3. Context / anchors

- `app/api/onboarding/user/route.ts` — session, wallet match, `userConsentRejection`, therapy vs platform tracks.
- `app/api/onboarding/psm/route.ts` — session, wallet match, `psmConsentRejection`.
- `lib/onboarding-identity.ts` — `sessionMatchesOnboardingWallet`, `decideOnboardingIdentity`.
- `lib/onboarding-consent.ts` — which yeses each alta requires.
- `components/onboarding/steps/StepPerfilUsuario.tsx` — consents, mood, payment preference.
- `components/onboarding/steps/StepRevision.tsx` — payload uses marked checkbox values.
- `components/onboarding/IntakeLiveForm.tsx` — drops implicit consent defaults on intake.

## 4. Acceptance criteria (Given / When / Then)

1. **Given** no session, **when** either onboarding POST runs, **then** the response is 401 and no user row is created.
2. **Given** a session for wallet A and a body for wallet B, **when** the POST runs, **then** the response is 403.
3. **Given** omitted consent fields, **when** the body is parsed, **then** those flags are false. Terms and privacy missing reject both altas. Sharing and matching missing reject only the therapy alta.

## 5. Data / schema changes

- Prisma model deltas: none for this slice (urgency `unsure` and payment fields landed in `27ac4c7`).
- `ConsentRecord` columns already default to `false`.
- Migration: none in the closing commit.
- Rollback: revert route guards and Zod defaults; rows created under the old implicit-consent behavior are not auto-fixed.

## 6. API contract (if any)

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/onboarding/user` | SIWE session | User intake + consents + `eoaAddress` | User row | Wallet must match session. Therapy track requires share + matching consents. |
| POST | `/api/onboarding/psm` | SIWE session | PSM intake + consents + `eoaAddress` | User + PSM profile | Terms + privacy required. Share/matching not required on PSM alta. |

## 7. QA gate (Definition of Done for this slice)

- [x] All acceptance criteria above pass (mapped to checks/tests).
- [x] `npm run lint` passes (warnings only, no errors).
- [x] `npx tsc --noEmit` passes.
- [x] At least one negative-path check exists.
- [x] No schema change in the closing commit.
- [x] Evidence: `lib/onboarding-identity.test.ts` (wallet match + consent rejections); `requireSession` on both POST routes.
- [x] Non-goals respected. Slice 4 does not start in this commit.

Mapped checks:

| AC | Check |
|----|--------|
| 1 | `requireSession` in `user/route.ts` and `psm/route.ts`; `handleAuthError` on catch |
| 2 | `sessionMatchesOnboardingWallet` in `lib/onboarding-identity.test.ts` |
| 3 | `userConsentRejection` / `psmConsentRejection` in `lib/onboarding-identity.test.ts`; Zod defaults `false` on consent fields |

## 8. Exit conditions (when the loop stops)

The loop ends when all acceptance criteria pass and the QA gate is green.

This slice stops here. Slice 4 (inbox and platform keys) shipped next; see `specs/safety-slice-4-inbox-platform-keys.md`. The next coding slice is 5 (admin session and audit) in [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md).

## 9. Decisions — LOCKED

1. Completed accounts cannot re-onboard on a different wallet (`decideOnboardingIdentity` → `already_registered`).
2. Platform signup needs only terms + privacy. Therapy signup also needs share-with-PSM and clinical-matching yeses.
3. PSM signup needs only terms + privacy; matching consents remain patient-only fields.
4. `preferenciaAsignacion` is always stored as `explorar` for new patient writes in this slice; the UI no longer blocks on a separate assignment picker.
