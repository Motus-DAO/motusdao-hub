# Safety slice 2 — Psychat session, consent, credit, and optional browser encryption — Spec

> Status: **SHIPPED** on `main` at `db54253` · Owner: product · 22 Oct 2026
>
> Purpose: clinical text does not leave the Hub unless the person is signed in and has already agreed. Psychat names Venice, meters use, and can encrypt that send in the browser. The thread is not a journal and not an expediente.
>
> Plan: [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md) slice 2. Chat ownership stays in [docs/specs/SDD-chat-data.md](../docs/specs/SDD-chat-data.md). This file records the code. Where the plan said “no Venice enclave / E2EE,” the product decision on 22 Oct 2026 overrode that line for the model call only. The code below is the source for later docs.
>
> This slice does not start slices 3–7 of the safety plan, or the later chat-data steps (Bitácora ciphertext, export package, Psychat archive, FHIR, training copy, RootRouter proxy, session enclave, always-on enclave).

---

## 1. Scope (what this slice delivers)

A Psychat send reaches Venice only for the signed-in Hub account that already stored `consentToAIProcessing = true`.

- `POST /api/chat` and `POST /api/onboarding/ai-intake` call `requireAiProcessingConsent`. No session is 401. A session without the stored yes is 403. The model is not asked to set the flag.
- The latest non-revoked `ConsentRecord` is the source of truth. Onboarding and `POST /api/consent/ai-processing` write it. The checkbox copy is `aiProcessingConsentCopy`.
- Client `role: "system"` messages are dropped. The server prompt is `PSYCHAT_SYSTEM_PROMPT`.
- The visit thread stays in React state. It is not written to Postgres.
- Default privacy is TEE on `e2ee-deepseek-v4-flash`: the Hub reads the text and forwards it in the clear. The screen says so. Inference still runs in Venice’s enclave. This path is not Venice Anonymous and not browser encryption.
- “Ajustes avanzados” can switch that visit to browser E2EE on the same model id. The browser encrypts the system prompt and the dialogue, checks attestation (`verified`, matching nonce, `debug !== true`), and the Hub relays ciphertext. The Hub does not decrypt that path. Previous assistant replies are packed inside the encrypted user turn, because Venice rejects a plaintext assistant field on this call.
- One Hub inference key (`VENICE_INFERENCE_KEY` or `VENICE_API_KEY`) serves every account. There is no per-user Venice key and no crypto top-up.
- Each account gets 0.10 USD of inference per calendar day, resetting at midnight `America/Mexico_City`. A Stripe payment of 5 or 10 USD adds a balance that does not reset. Free credit is spent first. The ring shows percent used, not the dollar amount. The click panel names the selected privacy mode.
- Charges store model, token counts, and USD. They do not store prompt text. The tables have row-level security on and no grants to `anon` or `authenticated`.

## 2. Non-goals (explicitly out of scope)

- Slice 3. Onboarding POSTs are not forced to match the SIWE wallet here. Consent flags are not reset to false for an existing yes.
- Slice 4. Inbox, faucet, Pimlico, and Ripio are unchanged.
- Slice 5. Admin session length, audit-write failure, and the SIWE domain allowlist are unchanged.
- Slice 6. No vendor list and no signed privacy notice. Production is not treated as a clinical system by this slice. Nothing is collected to train a model.
- Slice 7 and the chat-data steps after it. Bitácora stays plaintext. `MOCK_USER_ID` stays. No export package, no opt-in Psychat archive, no FHIR summary, no training copy, no RootRouter proxy, no session enclave, no always-on enclave.
- The E2EE key is an ephemeral key in the tab. It is not the WaaP key and not a Bitácora key. The wallet does not sign or display the chat.
- Attestation checks Venice’s `verified` flag, the nonce, and `debug !== true`, then encrypts to `signing_key`. Full Intel DCAP quote verification in the browser is not built.
- Intake has no privacy selector. It stays on the TEE path because the Hub must read the answers.
- No open model picker. The configured model is `e2ee-deepseek-v4-flash` (label “DeepSeek V4 Flash”).

## 3. Context / anchors

- `lib/auth/ai-consent.ts` — `requireAiProcessingConsent`, `hasStoredAiProcessingConsent`. Latest non-revoked row.
- `lib/ai-consent-copy.ts` — the sentence on the checkbox and the Psychat notice. TEE says the message leaves in the clear. E2EE says it leaves encrypted and Motus does not read that text.
- `lib/psychat-prompt.ts` — server-owned system prompt. The E2EE browser encrypts this same string.
- `lib/ai-client.ts` — `AI_PROVIDER=venice` uses `VENICE_MODEL` or `e2ee-deepseek-v4-flash`. A plaintext completion on an `e2ee-*` id is TEE. Missing key is 503, not 401.
- `lib/ai-credit.ts` — 0.10 USD, `America/Mexico_City`, pack sizes 5 and 10, free-then-purchased split, usage percent.
- `lib/ai-credit-store.ts` — reserve, settle, release. Advisory lock `pg_advisory_xact_lock(hashtext(userId))`.
- `lib/ai-credit-purchase.ts` — Stripe `checkout.session.completed` with `metadata.kind = ai_credit`. Idempotent on `stripeCheckoutSessionId`.
- `lib/venice-e2ee.ts` — browser crypto. ECDH secp256k1, HKDF-SHA256 info `ecdsa_encryption`, AES-256-GCM. History is one encrypted user turn plus the encrypted system prompt.
- `app/api/chat/route.ts` — TEE chat. Drops client system messages. Reserves credit around the call.
- `app/api/ai/e2ee/attestation/route.ts` — proxies Venice attestation. Returns `verified`, nonce, `debug: false`, and the signing key. Does not return the raw Intel quote.
- `app/api/ai/e2ee/chat/route.ts` — relays ciphertext with `X-Venice-TEE-*` headers. Caps the reply at 256 tokens. Retries once without the extra Venice parameters if the first call is 5xx.
- `app/api/ai/credit/route.ts`, `checkout/route.ts`, `confirm/route.ts` — balance, Stripe Checkout, and the localhost return confirm.
- `app/api/stripe/webhook/route.ts` — `kind=ai_credit` is fulfilled before course fulfillment.
- `app/psychat/page.tsx`, `components/ui/animated-ai-chat.tsx` — notice, advanced privacy radios, usage ring, buy 5 USD / 10 USD.
- `components/onboarding/steps/StepPerfilUsuario.tsx`, `IntakeLiveForm.tsx`, `StepRevision.tsx` — the same consent sentence. Default mode in the copy is TEE.

## 4. Acceptance criteria (Given / When / Then)

1. **Given** no session cookie, **when** `POST /api/chat` is called, **then** the response is 401 and Venice is not called.
2. **Given** a session and `consentToAIProcessing` false on the latest non-revoked record, **when** `POST /api/chat` or `POST /api/onboarding/ai-intake` is called, **then** the response is 403 and the provider is not called.
3. **Given** a client message with `role: "system"`, **when** `/api/chat` builds the provider payload, **then** that message is absent and the server prompt is `PSYCHAT_SYSTEM_PROMPT`.
4. **Given** the Psychat page, **when** it renders for Venice, **then** it names Venice and DeepSeek V4 Flash, states that the chat is not a clinical note and not an emergency, and the default mode says the message leaves in the clear.
5. **Given** the daily balance, **when** the usage ring renders, **then** the arc is the percent already used. A click shows that percent, what remains today, and “Privacidad estándar” or “Privacidad reforzada.” It does not show the 0.10 USD figure.
6. **Given** a paid Stripe Checkout of 5 or 10 USD with `metadata.kind=ai_credit`, **when** the webhook or `POST /api/ai/credit/confirm` runs, **then** that account’s `purchasedUsd` increases by the pack once. The balance does not reset at midnight. Free credit is spent first.
7. **Given** privacy reforzada, **when** the browser sends, **then** user and system fields on the relay are ciphertext, the attestation nonce matches, and a plaintext assistant field is not forwarded. **Negative path:** a user or system field that is not hex is rejected before Venice is called.
8. **Given** the credit tables, **when** a charge is stored, **then** the row has model, token counts, and USD, and no prompt text.

## 5. Data / schema changes

- `ConsentRecord.consentToAIProcessing` already existed, default `false`. This slice reads and writes it. It does not change the other consent columns.
- `AiCreditCharge` (`ai_credit_charges`): `costUsd`, `freeCoverUsd`, `purchasedHoldUsd`, `settled`, token counts, model. No prompt column.
- `AiCreditWallet` (`ai_credit_wallets`): `purchasedUsd`, one row per user.
- `AiCreditPurchase` (`ai_credit_purchases`): pack amount and unique `stripeCheckoutSessionId`.
- Migrations: `prisma/migrations/20261022190000_ai_credit_charges`, `prisma/migrations/20261022200000_ai_credit_purchases`.
- RLS is enabled. `anon` and `authenticated` have no grants. The app uses Prisma as the database owner.
- Rollback: drop `ai_credit_purchases` and `ai_credit_wallets`, then drop `freeCoverUsd` and `purchasedHoldUsd`, then drop `ai_credit_charges`. Do not drop `consent_records`. Purchased balances in those tables are lost on rollback.

## 6. API contract

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/ai/disclosure` | Public | — | `{ provider, providerLabel, model }` | Psychat uses this for the label. |
| GET | `/api/consent/ai-processing` | SIWE session | — | `{ consentToAIProcessing }` | Latest non-revoked row. |
| POST | `/api/consent/ai-processing` | SIWE session | `{ accepted: true }` | Stored yes | Does not call the model. |
| POST | `/api/chat` | Session + stored yes | `{ messages }` | Assistant text, `credit`, `creditNote` | Drops client system messages. TEE. 429 when credit is exhausted. 503 when the Venice key is missing. |
| POST | `/api/onboarding/ai-intake` | Session + stored yes | Intake answers | Model JSON | TEE. Same credit gate. No E2EE selector. |
| GET | `/api/ai/credit` | SIWE session | — | Snapshot + note | `remainingUsd`, `allowanceUsd`, `purchasedUsd`, `dailyUsd`, `spentUsd`. |
| POST | `/api/ai/credit/checkout` | SIWE session | `{ amountUsd: 5 \| 10 }` | `{ url }` | Stripe Checkout `mode=payment`, `metadata.kind=ai_credit`. |
| POST | `/api/ai/credit/confirm` | SIWE session, must own `metadata.userId` | `{ sessionId }` | Fulfilled purchase | Used when the webhook does not hit localhost. 402 if unpaid. |
| POST | `/api/ai/e2ee/attestation` | Session + stored yes | `{ nonce }` 64 hex chars | `{ verified, nonce, debug, signing_key }` | Refuses a failed, mismatched, or debug attestation. |
| POST | `/api/ai/e2ee/chat` | Session + stored yes | `{ messages, clientPublicKey, modelPublicKey }` | SSE stream | Ciphertext only. 502 when Venice rejects the call. |
| POST | `/api/stripe/webhook` | Stripe signature | `checkout.session.completed` | 200 | `kind=ai_credit` does not run course fulfillment. |

## 7. QA gate (Definition of Done for this slice)

- [x] Acceptance criteria 5–8 are covered by unit tests or by the shipped UI.
- [x] Negative path: plaintext user turn rejected (`lib/venice-e2ee.test.ts`); a charge the balance cannot cover is refused (`lib/ai-credit.test.ts`).
- [x] Migrations exist, with the rollback note in section 5.
- [x] Shipped on `main` as `db54253`.
- [x] `npm run lint` and `npx tsc --noEmit` pass on `main` after slice 3 close (27 Oct 2026).
- [x] Criteria 1–4 are implemented in the routes and the page. They do not yet have dedicated route tests.

Mapped checks:

| AC | Check |
|----|--------|
| 5 | `creditUsedPercent` in `lib/ai-credit.test.ts`. The ring in `components/ui/animated-ai-chat.tsx` uses that percent. |
| 6 | `splitCreditCharge` spends the free 0.10 USD before `purchasedUsd`. Fulfillment is idempotent on the Stripe session id. |
| 7 | `encryptConversation` emits only `system` and `user`, both ciphertext. `assertRelayMessages` rejects a plaintext user turn. |
| 8 | `ai_credit_charges` has no text column. The migration comment says rows store token counts and USD. |

## 8. Exit conditions

This slice stops here. Slice 3 (onboarding writes bound to the wallet) shipped next; see `specs/safety-slice-3-onboarding-wallet.md`. The next coding slice is 4 (inbox and platform keys) in [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md). Slice 6 (vendor list and privacy notice) can be drafted beside slices 4–5. It is not started.

## 9. Decisions — LOCKED

1. One Venice inference key for every account. The admin key is not used on the chat request. The operator tops up the Venice account. The Hub ledger is who may spend.
2. Free allowance is 0.10 USD per account per day, midnight in `America/Mexico_City` (the day starts at `YYYY-MM-DDT06:00:00.000Z`). Purchased 5 or 10 USD stays until it is used. Free credit is spent first.
3. The model id is `e2ee-deepseek-v4-flash`. The same id is TEE when the Hub sends plaintext and E2EE when the browser encrypts. There is no model picker and no Venice Anonymous mode.
4. Default mode is TEE. E2EE is opt-in from “Ajustes avanzados.” The usage ring shows percent used. The panel does not tell the person the allowance is 0.10 USD.
5. Browser E2EE encrypts to the attestation signing key after `verified === true`, nonce match, and `debug !== true`. Assistant history is inside the encrypted user turn. The reply cap on that path is 256 tokens. A 5xx is retried once without `venice_parameters`.
6. The visit thread is not stored. Saving Psychat, encrypting Bitácora, and a training copy are later slices.
