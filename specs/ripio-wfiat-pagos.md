# Ripio wFIAT on `/pagos` — Spec

> Status: **ACTIVE** · Owner: product + eng · Slice size: ≤1 day
>
> Purpose: list Ripio local-currency stablecoins (wFIAT) on Pagos for
> hold / send / receive, and swap **wARS / wBRL ↔ USDT in-app** with the
> user's WaaP wallet (Textile FX liquidity, Motus UI).
> Does **not** replace the Ramps Widget partner account.

---

## 1. Scope (what this slice delivers)

- Pagos token picker, balances, send, and receive include Ripio wFIAT on Celo: `wARS`, `wBRL`, `wMXN`, `wCOP`, `wPEN`, `wCLP`.
- Users can send those ERC-20s from their wallet like any other listed stable.
- For **wARS** and **wBRL**, Pagos opens a swap panel with **two paths**:
  - **En Motus (WaaP)** — same wallet; live execution when `TEXTILE_API_KEY` is set.
  - **Otra wallet** — opens Textile FX; user swaps there, then sends tokens to their Motus EOA (copy address in the panel / Pagos Recibir).

## 2. Non-goals (explicitly out of scope)

- Ripio Ramps Widget going live (still blocked on partner `client_id` / `client_secret`).
- Mint / redeem wFIAT against bank fiat (SPEI, PIX, CVU).
- Homemade AMM / Uniswap pool on Celo (no wFIAT Uniswap v3 pools vs USDC/USDT/USDm).
- Swap CTA for `wMXN`, `wCOP`, `wPEN`, `wCLP`.
- Changing Academy Stripe checkout.
- Adding wFIAT as a Celo gas (feeCurrency) token.
- Embedding Textile's hosted web app inside an iframe.

## 3. Context / anchors

- [`lib/celo.ts`](../lib/celo.ts) — `CELO_STABLE_TOKENS`
- [`lib/ripio/wfiat.ts`](../lib/ripio/wfiat.ts) — addresses, catalog
- [`lib/textile/fx.ts`](../lib/textile/fx.ts) — Celo corridors, amount math
- [`lib/textile/server.ts`](../lib/textile/server.ts) — Textile API key (server-only)
- [`app/api/textile/quote/route.ts`](../app/api/textile/quote/route.ts)
- [`app/api/textile/swap/route.ts`](../app/api/textile/swap/route.ts)
- [`components/payments/WfiatSwapPanel.tsx`](../components/payments/WfiatSwapPanel.tsx)
- [`lib/payments.ts`](../lib/payments.ts) — WaaP `sendUnsignedEvmTx`
- Docs: [Textile FX v1](https://docs.textilecredit.com/api/v1/), [quotes](https://docs.textilecredit.com/api/v1/quotes), [swaps](https://docs.textilecredit.com/api/v1/swaps), [public tickers](https://docs.textilecredit.com/api/rates)

## 4. Acceptance criteria (Given / When / Then)

1. **Given** a logged-in user on `/pagos`, **when** they open the token list, **then** `wARS`, `wBRL`, `wMXN`, `wCOP`, `wPEN`, and `wCLP` appear with category Ripio wFIAT.
2. **Given** one of those tokens is enabled, **when** balances load, **then** the app reads the Celo ERC-20 at the published Ripio address (18 decimals).
3. **Given** the user selects `wARS` or `wBRL` and opens swap, **when** the panel shows, **then** they can choose **En Motus** or **Otra wallet**.
4. **Given** **Otra wallet**, **when** they continue, **then** Textile FX opens in a new tab and the panel shows the Motus EOA with a copy control so they can send funds back.
5. **Negative path:** **given** `wMXN` / `wCOP` / `wPEN` / `wCLP` selected, **when** the token detail / send panel renders, **then** no swap CTA is shown.
6. **Given** `TEXTILE_API_KEY` is unset and **En Motus** is selected, **when** they enter an amount, **then** they see an indicative quote and Confirm stays disabled (never leak the key).
7. **Given** `TEXTILE_API_KEY` is set, **En Motus** selected, and the book has liquidity, **when** they confirm, **then** they sign approve + swap with WaaP.
8. **Given** Transak / Mt Pelerin / Ripio ramps flags unchanged, **when** Pagos loads, **then** on-ramp provider behavior is unchanged.

## 5. Data / schema changes

- None (no Prisma changes).

## 6. API contract

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/textile/quote` | none (wallet address optional) | `{ sellSymbol, buySymbol, sellAmount, address? }` | `{ mode: 'live'\|'indicative', buyAmount, liveExecution, … }` | Tickers are public; live book needs `TEXTILE_API_KEY` |
| POST | `/api/textile/swap` | none (taker required) | `{ sellSymbol, buySymbol, sellAmount, taker, minRateRay? }` | `{ fillable, transactions.approval?, transactions.swap }` or 503 | Server-only Textile key |
| POST | `/api/textile/submit` | none | `{ id, txHash }` | `{ ok: true }` | Reports hash to Textile |

### Env vars

| Var | Where | Purpose |
|-----|--------|---------|
| `TEXTILE_API_KEY` | server | Textile FX v1 bearer key (`tx_live_…`). Never `NEXT_PUBLIC_`. Request from contact@textilecredit.com with scopes `quotes:read` + `trades:write`. |

## 7. QA gate (Definition of Done for this slice)

- [x] Acceptance criteria above pass.
- [x] `npm run lint` passes on touched files.
- [x] `npx tsc --noEmit` passes.
- [x] `npm test` includes wFIAT + Textile pair/amount checks.
- [x] Non-goals respected.

## 8. Exit conditions

Loop ends when AC pass, QA gate green, and no critical findings.

## 9. Decisions — LOCKED

1. All six wFIAT tokens are listed for send/receive; only `wARS` and `wBRL` get a swap CTA.
2. Swap panel offers **En Motus (WaaP)** and **Otra wallet (Textile FX)**. External path is for wallets Textile can connect; user then sends to the Motus EOA shown in the panel.
3. Without `TEXTILE_API_KEY`, En Motus stays quote-only. Otra wallet still works.
4. Addresses come from Ripio’s Celo launch + Bridge docs (same address every chain, 18 decimals). USDT on Celo is 6 decimals.
