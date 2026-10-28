# Safety slice 5 — Admin session and audit — Spec

> Status: **SHIPPED** on `main` at `1e7ae55` · Owner: product · 27 Oct 2026
>
> Purpose: a revoked admin loses access on the next request, clinical sessions expire sooner with idle timeout, failed audit writes roll back journal/profile mutations, and SIWE domains come from an allowlist—not raw forwarded hosts.
>
> Plan: [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md) slice 5.

---

## 1. Scope (what this slice delivers)

- `requireAdmin` always re-reads `role` and `isPlatformAdmin` from Postgres. A JWT that still claims admin when the row does not is 403.
- Hub session cookie max age is **3 days** (was 7). **Idle expiry is 12 hours** from `lastActiveAt`, slid at most every 5 minutes on authenticated API calls (`requireSession`).
- `recordClinicalAccess` throws `ClinicalAuditError` on failure (no silent swallow).
- Journal and profile **mutations** run in a Prisma transaction with the audit row so a failed audit rolls back the clinical write.
- SIWE nonce messages use `getSiweIssueDomain()` from `NEXT_PUBLIC_APP_URL`. Verify checks `assertAllowedSiweDomain` on the message domain (`NEXT_PUBLIC_APP_URL` host plus optional `SIWE_ALLOWED_DOMAINS`).

## 2. Non-goals

- Slice 6–7 and chat-data steps do not start.
- No MFA product.
- Other routes that audit after a write without a transaction are unchanged in this slice; journal and profile satisfy AC 2.

## 3. Context / anchors

- `lib/auth/constants.ts` — `SESSION_MAX_AGE_SECONDS`, `SESSION_IDLE_MAX_SECONDS`, `SESSION_SLIDE_MIN_SECONDS`.
- `lib/auth/session.ts` — idle check, slide cookie, `requireAdmin` DB read.
- `lib/auth/admin-access.ts` — `userHasAdminPrivileges`.
- `lib/auth/siwe-domain.ts` — allowlist and issue domain.
- `lib/auth/verify-siwe.ts`, `app/api/auth/nonce/route.ts`, `app/api/auth/verify/route.ts`.
- `lib/clinical-audit.ts` — `ClinicalAuditError`, `handleClinicalAuditError`.
- `app/api/bitacora/route.ts`, `app/api/profile/route.ts` — transactional writes.

## 4. Acceptance criteria (Given / When / Then)

1. **Given** a JWT that still says `isPlatformAdmin: true` and a database row that says false, **when** an admin route runs, **then** the response is 403.
2. **Given** a forced audit-write failure, **when** a journal or profile write runs, **then** the response is 500 and the clinical write is not committed.
3. **Given** a SIWE message whose domain is not on the allowlist, **when** verify runs, **then** the response is 401.

## 5. Data / schema changes

- None.

## 6. QA gate

- [x] `lib/auth/admin-access.test.ts`, `lib/auth/siwe-domain.test.ts`, `lib/auth/session-policy.test.ts`.
- [x] `npm run lint` / `npx tsc --noEmit` pass.
- [x] Non-goals respected.

| AC | Check |
|----|--------|
| 1 | `requireAdmin` DB gate; `userHasAdminPrivileges` unit test |
| 2 | Transaction + throwing `recordClinicalAccess` on bitácora/profile mutations |
| 3 | `assertAllowedSiweDomain` in verify; nonce uses `getSiweIssueDomain` |

## 7. Exit conditions

This slice stops here. Next: slice 6 (vendor list + privacy notice, human) and slice 7 (Bitácora ciphertext). See [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md).

## 8. Decisions — LOCKED

1. Session max age **3 days**, idle **12 hours**, slide cookie every **5 minutes** at most on `requireSession`.
2. Allowlist hosts: `NEXT_PUBLIC_APP_URL` host, `SIWE_ALLOWED_DOMAINS` (comma-separated), plus localhost ports in non-production.
3. Issue domain for new SIWE messages is always `getSiweIssueDomain()`, not `x-forwarded-host`.
