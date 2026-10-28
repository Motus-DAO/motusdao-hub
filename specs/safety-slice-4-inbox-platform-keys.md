# Safety slice 4 — Inbox and platform keys — Spec

> Status: **SHIPPED** on `main` at `25b936f` · Owner: product · 27 Oct 2026
>
> Purpose: listing contact messages and spending Hub platform credentials (faucet, Pimlico, Ripio) require a signed-in account. Anonymous callers cannot read the inbox or burn partner API keys.
>
> Plan: [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md) slice 4. Chat-data and Bitácora do not start here.

---

## 1. Scope (what this slice delivers)

- `GET /api/contact` calls `guardAdmin`. No admin session is 401/403 and the body has no messages.
- `POST /api/contact` stays public and is rate-limited per client IP (5 posts / 15 minutes).
- `POST /api/faucet` calls `requireSession`. The body's `address` must match `session.eoaAddress`. Claims are capped per Hub account (`userId`, else EOA). Without a session the route returns 401 and does not send CELO.
- `POST /api/pimlico/paymaster` and `POST /api/pimlico/bundler` call `requireSession` and reject JSON-RPC methods outside an allowlist before calling Pimlico.
- `POST /api/ripio/widget-token` calls `requireSession` and refuses when `address` does not match the session wallet.
- Browser callers that use these routes send `credentials: 'include'` so the session cookie reaches the API.

## 2. Non-goals (explicitly out of scope)

- Slice 5–7 and chat-data steps do not start.
- No Stripe webhook or course-payment changes.
- No on-chain payment-record schema changes.
- Contact `POST` does not require SIWE (public form with rate limit only).
- Redis-backed rate limits (in-memory is acceptable for this slice).

## 3. Context / anchors

- `lib/platform-spend-guard.ts` — Pimlico allowlist, contact rate limit, wallet binding, faucet account key.
- `app/api/contact/route.ts` — admin GET, rate-limited POST.
- `app/api/faucet/route.ts` — session + per-account interval.
- `app/api/pimlico/paymaster/route.ts`, `app/api/pimlico/bundler/route.ts` — session + allowlist.
- `app/api/ripio/widget-token/route.ts` — session + address bind.
- `lib/pimlico-paymaster.ts`, `lib/contexts/ZeroDevSmartWalletProvider.tsx` — `credentials: 'include'` on proxy calls.
- `components/onboarding/steps/StepBlockchain.tsx`, `lib/mns-register.ts`, `app/motus-names/page.tsx`, `app/pagos/page.tsx` — faucet/Ripio cookies.

## 4. Acceptance criteria (Given / When / Then)

1. **Given** no admin session, **when** `GET /api/contact` runs, **then** the response is 401 or 403 and the body has no messages.
2. **Given** production (or any env), **when** `POST /api/faucet` is called with no session, **then** the response is 401 and CELO is not sent.
3. **Given** no session, **when** the Pimlico proxy or Ripio token route is called, **then** the response is 401 and the upstream credential is not used.
4. **Negative path:** **given** a session for wallet A and a faucet or Ripio body for wallet B, **when** the POST runs, **then** the response is 403.
5. **Negative path:** **given** a JSON-RPC method not on the allowlist, **when** `POST /api/pimlico/bundler` runs with a valid session, **then** the response is 403 and Pimlico is not called.

## 5. Data / schema changes

- None.

## 6. API contract (if any)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/contact` | Admin | Paginated inbox |
| POST | `/api/contact` | Public | Rate-limited create |
| POST | `/api/faucet` | SIWE session | Address must match session EOA |
| POST | `/api/pimlico/paymaster` | SIWE session | Allowlisted JSON-RPC only |
| POST | `/api/pimlico/bundler` | SIWE session | Allowlisted JSON-RPC only |
| POST | `/api/ripio/widget-token` | SIWE session | Address must match session EOA |

## 7. QA gate (Definition of Done for this slice)

- [x] Acceptance criteria mapped to guards and tests.
- [x] `npm run lint` passes (warnings only).
- [x] `npx tsc --noEmit` passes.
- [x] Negative paths: `lib/platform-spend-guard.test.ts` (allowlist, wallet bind, contact rate limit).
- [x] Non-goals respected. Slice 5 does not start in this commit.

| AC | Check |
|----|--------|
| 1 | `guardAdmin` on `GET /api/contact` |
| 2–3 | `requireSession` on faucet, Pimlico, Ripio; `handleAuthError` before upstream |
| 4 | `sessionOwnsSpendAddress` in tests + routes |
| 5 | `isAllowedPimlicoMethod` in tests + bundler/paymaster routes |

## 8. Exit conditions

This slice stops here. The next spec is slice 5 (admin session and audit) in [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md). Slice 6 (vendor list and privacy notice) can continue in parallel.

## 9. Decisions — LOCKED

1. Faucet always requires SIWE, including development. Onboarding step 0 already blocks until SIWE is ready before step 1 (faucet).
2. Faucet rate limit keys on `userId` when present, otherwise `eoaAddress` (one hour in production, two minutes in development).
3. Contact rate limit keys on the first `x-forwarded-for` hop, else `x-real-ip`, else `unknown`.
4. Pimlico allowlist includes paymaster, bundler, and `pimlico_getUserOperationGasPrice` for the balance probe in `lib/pimlico-paymaster.ts`.
