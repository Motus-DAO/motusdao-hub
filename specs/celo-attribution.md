# Celo attribution (ERC-8021) — Spec

> Status: **ACTIVE** · Owner: eng · Slice: hackathon Ripio
>
> Purpose: every Celo **mainnet** transaction the Hub sends carries the builder
> code assigned at enrollment. An untagged transaction can never be credited
> retroactively, so tagging lives where the client is built, not per call site.

---

## 1. Scope (what this slice delivers)

- `lib/attribution.ts`: code validation, cached suffix, and a helper for manual calldata.
- `lib/payments.ts`: viem `dataSuffix` on the WaaP wallet client, so payments and swaps are tagged.
- `lib/mns-register.ts`: suffix appended on the hand-built `eth_sendTransaction` path.
- `scripts/verify-attribution.mjs` + `npm run verify:attribution`: on-chain proof per tx hash,
  plus a repo-derivation check against the assigned code.
- Unit tests in `lib/attribution.test.ts`.

## 2. Non-goals (explicitly out of scope)

- Server-side faucet and admin keys (`app/api/faucet`) — platform activity, not user flow.
- x402: the Celo facilitator does not write Schema 2 tags yet, so those settlements stay untagged.
- ERC-4337 smart accounts: the Hub's WaaP wallet is an EOA; if a provider is later wrapped in a
  smart account, the suffix moves inside the UserOperation `callData` and must be re-verified.
- Any UI: tagging is invisible and must not change payment UX.

## 3. Context / anchors

- [`lib/attribution.ts`](../lib/attribution.ts) — code + suffix
- [`lib/payments.ts`](../lib/payments.ts) — `createPrivyWalletClient` (WaaP)
- [`lib/mns-register.ts`](../lib/mns-register.ts) — `sendWaaPTransaction`
- [`scripts/verify-attribution.mjs`](../scripts/verify-attribution.mjs)
- [`@celo/attribution-tags`](https://github.com/celo-org/attribution-tags) (BUILDERS.md)

## 4. Acceptance criteria (Given / When / Then)

1. **Given** `NEXT_PUBLIC_CELO_ATTRIBUTION_CODE` set, **when** a payment is sent from `/pagos`,
   **then** the tx `input` ends with the ERC-8021 suffix and `verifyTx` returns that code.
2. **Given** the same code, **when** an MNS registration is sent, **then** its calldata is tagged too.
3. **Given** no code configured, **when** a payment is sent, **then** it is sent untagged and the app
   keeps working (tagging is never a payment blocker).
4. **Given** a malformed code, **when** the app boots, **then** it warns once, disables tagging, and
   does not throw.
5. **Given** a tx hash, **when** running `npm run verify:attribution -- <hash>`, **then** it exits `0`
   only if the expected code is present, `1` if the tag is missing or different.
6. **Given** a repo slug, **when** running `npm run verify:attribution -- --repo owner/repo --code X`,
   **then** a derivation mismatch exits `1`.

## 5. Data / schema changes

- None.

## 6. Env vars

| Var | Where | Purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_CELO_ATTRIBUTION_CODE` | client + server | Assigned builder code; public, not a secret |
| `CELO_ATTRIBUTION_CODE` | server / scripts | Same value for CLI verification |
| `NEXT_PUBLIC_CELO_RPC_URL` | scripts | RPC for `verifyTx` (default `https://forno.celo.org`) |

## 7. Verification

```bash
# 1. Which code is configured, and does it match the repo?
npm run verify:attribution -- --show
npm run verify:attribution -- --repo MotusDAO/motusdao-hub --code celo_xxxxxxxx

# 2. After sending a real tx (0.01 wMXN to yourself is enough)
npm run verify:attribution -- 0x<txHash> celo_xxxxxxxx
```

**Evidence**

| Date | Check | Result |
|------|-------|--------|
| 2026-11-07 | Rampa Ripio → wallet WaaP (10 wMXN), flujo previo al cambio | ✅ recibidos |
| pending | Tx post-cambio con sufijo, `verifyTx` | ⏳ |

## 8. QA gate (Definition of Done for this slice)

- [x] `npm run lint` on touched files.
- [x] `npx tsc --noEmit`.
- [x] `npm test` includes `lib/attribution.test.ts`.
- [x] Non-goals respected.
- [ ] Post-change tx verified on Celo mainnet (requires a real send).

## 9. Rollback

- Unset `NEXT_PUBLIC_CELO_ATTRIBUTION_CODE` → tagging disabled, no code change needed.
- `git revert` in reverse order: docs → script → payments → helper. Each commit is independent.

## 10. Decisions — LOCKED

1. Tag at the **client seam** (viem `dataSuffix`), not at each `sendTransaction`.
2. Manual calldata paths use `appendAttributionData`, idempotent by design.
3. An invalid code warns once and disables tagging; it never breaks a payment.
4. The expected code is the one **assigned at enrollment**, not a hostname derivation.
