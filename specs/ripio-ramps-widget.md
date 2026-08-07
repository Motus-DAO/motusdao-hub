# Ripio Ramps Widget on `/pagos` — Spec

> Status: **ACTIVE** · Owner: product + eng · Slice size: ≤1 day
>
> Purpose: let users open Ripio on-ramp / off-ramp from Pagos via the hosted
> Ramps Widget, with a mock/demo path until partner credentials exist.

---

## 1. Scope (what this slice delivers)

- Ripio appears as an on-ramp provider on `/pagos`.
- Off-ramp control for the same provider.
- Without `RIPIO_CLIENT_ID` / `RIPIO_CLIENT_SECRET`, the UI opens an in-app **mock** panel (MXN SPEI/CLABE-style demo).
- With credentials + `RIPIO_ENV`, the same buttons fetch a Widget JWT and open Ripio’s hosted URL.

## 2. Non-goals (explicitly out of scope)

- Buy / Hold / Sell `<ripio-widget />` (CaaS web component).
- Sell & Pay merchant QR.
- Custodial CaaS swaps / balances.
- Adding wFIAT token addresses to `lib/celo.ts`.
- Changing Academy Stripe checkout.

## 3. Context / anchors

- [`app/pagos/page.tsx`](../app/pagos/page.tsx) — provider grid + Ripio handlers
- [`app/api/ripio/widget-token/route.ts`](../app/api/ripio/widget-token/route.ts) — mock vs live JWT
- [`lib/ripio/ramps-widget.ts`](../lib/ripio/ramps-widget.ts) — env, URLs, UUID v5 `external_ref`
- [`components/payments/RipioRampsMockPanel.tsx`](../components/payments/RipioRampsMockPanel.tsx) — multi-step demo wizard
- [`lib/ripio/ramps-mock-session.ts`](../lib/ripio/ramps-mock-session.ts) — shared sessionStorage (T&C + KYC), mock quote math
- Ripio docs: [Widget access](https://docs.ripio.com/ramps-api/widget/accessing-widget), [Widget auth](https://docs.ripio.com/ramps-api/widget/authentication)

## 4. Acceptance criteria (Given / When / Then)

1. **Given** no Ripio secrets and user logged in with wallet + destination, **when** they start Ripio on-ramp, **then** the mock wizard opens with full steps (intro → T&C → KYC → deposit account → quote → SPEI payment → order status → redirect summary).
2. **Given** mock off-ramp flow, **when** user completes wizard, **then** steps run: intro → T&C → KYC → fiat account → session → amount → send crypto → order status → redirect summary.
3. **Given** KYC completed in on-ramp mock this browser session, **when** user opens off-ramp mock, **then** T&C/KYC steps are skipped (sessionStorage per wallet).
4. **Given** either flow completes, **when** success screen shows, **then** fake redirect query params match Ripio widget shape (`action`, `crypto_amount`, `fiat_amount`, `network=CELO`, `token=USDC`).
5. **Given** valid `RIPIO_CLIENT_ID` + `RIPIO_CLIENT_SECRET` and `RIPIO_MOCK` unset, **when** token route is called, **then** response is `mode: 'live'` with `widgetUrl` (or a clear Ripio auth error — never leaks `client_secret`).
6. **Negative path:** **given** invalid `externalRef` (not UUID), **when** POST `/api/ripio/widget-token`, **then** `400` with validation error.
7. **Given** Transak / Mt Pelerin / Privy flags unchanged, **when** those providers are disabled, **then** their previous behavior is unchanged.

## 5. Data / schema changes

- None (no Prisma changes).

## 6. API contract

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/ripio/widget-token` | session not enforced (wallet address required) | `{ address, externalRef, flow: 'onramp'\|'offramp' }` | mock: `{ mode:'mock', flow, address }` · live: `{ mode:'live', token, widgetUrl, … }` | Secrets server-only |

### Env vars

| Var | Where | Purpose |
|-----|--------|---------|
| `RIPIO_CLIENT_ID` | server | Partner id from Ripio |
| `RIPIO_CLIENT_SECRET` | server | Partner secret — never `NEXT_PUBLIC_` |
| `RIPIO_ENV` | server | `sandbox` (default) \| `production` |
| `RIPIO_MOCK` | server | `true` forces mock even with secrets |
| `NEXT_PUBLIC_RIPIO_RAMPS_ENABLED` | client | `false` hides Ripio; default shown |

### Flip mock → live

1. Obtain sandbox `client_id` / `client_secret` from Ripio (no self-serve dashboard).
2. Set secrets in `.env.local` / hosting env.
3. Set `RIPIO_ENV=sandbox`.
4. Ensure `RIPIO_MOCK` is unset or not `true`.
5. Restart Next.js; on-ramp should `window.open` Ripio widget URL.

## 7. QA gate (Definition of Done for this slice)

- [ ] Acceptance criteria above pass.
- [ ] `npm run lint` passes on touched files.
- [ ] `npx tsc --noEmit` passes.
- [ ] Negative-path validation on `/api/ripio/widget-token` works.
- [ ] Non-goals respected.

## 8. Exit conditions

Loop ends when AC pass, QA gate green, and no critical findings.

## 9. Decisions — LOCKED

1. Product = **Ramps Widget** (URL redirect), not CaaS Buy/Hold/Sell.
2. Mock currency copy = **MXN** (SPEI/CLABE).
3. `external_ref` = UUID v5 from Motus user id / auth provider id / wallet fallback.
4. Ripio listed first among on-ramp providers; shown unless `NEXT_PUBLIC_RIPIO_RAMPS_ENABLED=false`.

## 10. Partner handoff checklist (send to Ripio / BD)

- [ ] Request sandbox `client_id` + `client_secret` for **Ramps Widget** (on + off).
- [ ] Confirm country account starts with **Mexico (MXN)**.
- [ ] Confirm post-confirmation redirect URL (e.g. `https://<app>/pagos`).
- [ ] Ask for sample `GET /api/v1/depositNetworks/?include_currency=true` (Celo + assets).
- [ ] Clarify whether “no-cost” Celo ramps apply to B2B partners.
- [ ] Confirm production KYB / contract path and timeline.
