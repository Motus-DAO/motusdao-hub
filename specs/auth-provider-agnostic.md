# Auth Provider Agnostic — Slice A/B

> Status: **ACTIVE** · Owner: product + eng · Slice size: ≤1 day
>
> Purpose: introduce a wallet/auth facade so app code depends on a provider-agnostic interface (`useWallet`) instead of vendor-specific hooks (`useWaaP`).

---

## 1. Scope (what this slice delivers)

- Add `lib/wallet/` facade (types + hooks) mapped to current WaaP implementation.
- Add `WalletProviderWrapper` component as provider-agnostic entrypoint.
- Migrate key app call sites to `useWallet` / `useWallets` / `useWalletProvider`.
- Keep behavior unchanged for users.

## 2. Non-goals (explicitly out of scope)

- No removal of Privy support — `privy` remains a valid `authProvider` value.
- No dropping the `privyId` DB column in this slice (still used when `authProvider === 'privy'`).
- No second wallet provider implementation yet (Privy adapter comes later).
- No ZeroDev refactor in this slice.

## 2b. Identity model (LOCKED)

| Field | Meaning |
|-------|---------|
| `authProvider` | Which vendor signed the user in: `waap`, `privy`, or `external` |
| `authProviderId` | That vendor's user id (canonical for all providers) |
| `privyId` | Legacy column — **only written when provider is Privy** |
| `eoaAddress` | On-chain identity (SIWE) — stable join key |

You can run WaaP today, add Privy tomorrow, or both — app code uses `useWallet()` + `authProvider`/`authProviderId`, not vendor-specific field names.

## 3. Context / anchors

- `lib/contexts/WaaPProvider.tsx` — current provider + hooks.
- `components/WaaPProviderWrapper.tsx` — current provider wrapper.
- `app/layout.tsx` — app provider mountpoint.
- `components/layout/Topbar.tsx`, `components/layout/Sidebar.tsx`, `components/onboarding/steps/StepConnect.tsx`, `components/auth/AppSessionProvider.tsx`, `lib/auth/use-siwe-session.ts` — first consumers.

## 4. Acceptance criteria (Given / When / Then)

1. **Given** the app boots, **when** auth hooks are resolved, **then** provider mount uses `WalletProviderWrapper` (not WaaP-named wrapper).
2. **Given** migrated UI/components, **when** they need auth state, **then** they import from `@/lib/wallet` instead of `@/lib/contexts/WaaPProvider`.
3. **Given** existing login/logout/session behavior, **when** user authenticates, **then** behavior remains unchanged (same EOA + SIWE flow).
4. **Negative path:** **given** wallet provider is unavailable, **when** SIWE sign-in is attempted, **then** current error handling remains intact.

## 5. Data / schema changes

- Prisma model deltas: none.
- Migration: none.
- Seed impact: none.

## 6. API contract (if any)

No API changes in this slice.

## 7. QA gate (Definition of Done for this slice)

- [ ] Acceptance criteria pass.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] No new `useWaaP` imports in migrated files.
- [ ] Non-goals respected.

## 8. Exit conditions (when the loop stops)

The loop ends when facade + migrations compile and key flows keep current behavior.

## 9. Decisions — LOCKED

1. Canonical app-facing hooks are `useWallet`, `useWallets`, `useWalletProvider`.
2. `WaaP` remains the backing implementation for now (adapter via facade).
3. Legacy aliases can remain temporarily for backward compatibility.
