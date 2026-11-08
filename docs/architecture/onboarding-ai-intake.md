# Onboarding AI intake — disabled

> **Status: DISABLED (2026-11-08).** The manual profile form is the default.
> Flag: `NEXT_PUBLIC_AI_INTAKE_ENABLED=false` (default). Set it to `true` only after
> the fixes below.

## What it was

A 3-question chat inside the patient onboarding (`StepPerfilUsuario` →
`StepAIIntake`). It called `/api/onboarding/ai-intake` (Venice TEE:
`e2ee-glm-5-3-flash`), extracted profile fields into the onboarding store, and wrote
`extractedData` into the live form. A companion endpoint
`/api/onboarding/ai-consent` stored `consentToAIProcessing` before the first model call.

## Why we disabled it

1. **It did clinical triage.** Q2 asked “¿cómo está afectando esto tu vida diaria:
   bajo / medio / alto / no estoy seguro?” and wrote `urgencyLevel`. That is a clinical
   assessment; it belongs to the professional in the session, not to an onboarding bot.
   We removed the severity question from the prompt, but the flow still feels wrong.
2. **It treated legal consents as chat fields.** `computeMissingFields` required
   `consentToShareWithPSM` and `consentToClinicalMatching`. When those were the only
   “missing” items, the chat said “baja al formulario”, listed raw field keys, and the
   conversation dead-ended. Consents are checkboxes, not questions.
3. **The handoff was broken.** The AI’s “handoff_ready” message tells the user to finish
   in the form below, which defeats the purpose of a conversational intake. The progress
   ring also mixed profile data with consents (9/16, 56%).
4. **It was slow.** The original model (`e2ee-deepseek-v4-flash`, reasoning + TEE) took
   ~9–10 s for a JSON response and up to ~20 s with the full prompt; the UI has no
   streaming. It is faster with `e2ee-glm-5-3-flash` (~4–6 s), but still not instant.
5. **It created a provisional user.** Onboarding creates the `User` only on final submit;
   the AI consent guard needed a `userId` before that. We added
   `resolveOnboardingAiUserId` (provisional user keyed by wallet) so the consent/intake
   could work, and the final onboarding updates that user. The mechanism works, but it
   exists only to support a feature that is now hidden.

## What remains in the code

The code is kept behind the flag, not deleted:

- `components/onboarding/steps/StepAIIntake.tsx`
- `components/onboarding/IntakeChatStepper.tsx`, `IntakeLiveForm.tsx`
- `app/api/onboarding/ai-intake/route.ts`
- `app/api/onboarding/ai-consent/route.ts`
- `lib/auth/ai-consent.ts` (`resolveOnboardingAiUserId`, `requireOnboardingAiConsent`)
- `lib/ai-consent-copy.ts` (`onboardingIntakeConsentCopy`)

The manual form (`StepPerfilUsuario`) is unchanged and is the only path users see.

## To re-enable

1. **Keep triage out.** Do not ask about severity, daily impact, diagnosis or risk.
   `urgencyLevel` must stay `unsure` by default and be explored by the PSM. The current
   prompt already has this rule; do not reintroduce `urgencyLevel` in `QUESTION_GUIDE` or
   `computeMissingFields`.
2. **Separate consents from the chat.** Remove `consentToShareWithPSM` and
   `consentToClinicalMatching` from `computeMissingFields` and from Q3. Consents stay in
   the form. The AI’s completion should depend only on conversational fields.
3. **Make the handoff explicit.** After Q2 (or when the user declines), the AI should say
   “Ya tengo tus datos; revisa y firma los consentimientos” and scroll/highlight the
   consent block. Never list raw keys like `consentToShareWithPSM`.
4. **Fix progress.** Count only data fields in the AI ring; show consents as a separate
   “firma pendiente” state.
5. **Keep the consent gate.** The checkbox + `/api/onboarding/ai-consent` must run before
   the first model call. Keep the TEE copy (`onboardingIntakeConsentCopy`); do not claim
   E2EE — the intake is TEE, not client-side E2EE.
6. **Keep the provisional user.** `resolveOnboardingAiUserId` is required because the
   final `User` is created at submit. Verify the final onboarding updates it instead of
   creating a duplicate.
7. **Test end to end with a fresh wallet:** consent → provisional user → Q1/Q2 → form
   prefilled → consents → submit → one user row, no duplicate; no severity question; no
   “baja al formulario” dead end.
8. **Only then** set `NEXT_PUBLIC_AI_INTAKE_ENABLED=true` in Preview and verify latency,
   credits and the consent record.

## Verification checklist

- [ ] New wallet: no 403 on the first AI message.
- [ ] The chat never asks about severity, daily impact or diagnosis.
- [ ] The chat never asks for legal consents.
- [ ] After Q2, the message points to the consent checkboxes, not the whole form.
- [ ] Progress counts data fields, not consents.
- [ ] Final submit updates the provisional user (no duplicate email/wallet).
- [ ] `NEXT_PUBLIC_AI_INTAKE_ENABLED=false` hides the toggle (manual form only).
