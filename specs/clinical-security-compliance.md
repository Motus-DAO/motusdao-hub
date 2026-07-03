# Clinical Security & Compliance — Spec

> Status: **DRAFT** · Owner: product + eng · Parent: `specs/platform-harmonize.md` §9
>
> Purpose: harden MotusDAO Hub for mental-health data — authorization, audit trails,
> session policy, prod guardrails, and ops compliance minimums (LFPDPPP / HIPAA-style).

---

## 1. Scope (what this slice delivers)

Five sub-slices (implement in order — see parent §9.3):

| ID | Deliverable |
|----|-------------|
| **9.3a** | Complete server-side auth audit on sensitive API routes |
| **9.3b** | Clinical access logging on all PHI-touching operations |
| **9.3c** | Shorter sessions + idle timeout on clinical pages; logout clears SIWE before wallet |
| **9.3d** | CI/deploy fails if dev bypass env vars present in production |
| **9.3e** | Runbooks: data handling, breach response, vendor BAA checklist |

## 2. Non-goals (explicitly out of scope)

- Legal HIPAA certification or counsel opinion
- Application-layer E2E encryption of journal / session notes (unless legal mandates)
- Migrating from SIWE to Supabase Auth or password login
- Replacing Supabase/Postgres encryption at rest (document reliance on provider)
- Blocking Academy course sales on incomplete 9.3b (see priority in parent §9.6)

## 3. Context / anchors

**Auth & session**

- `lib/auth/session.ts` — JWT cookie, `SESSION_MAX_AGE_SECONDS` (currently 7 days)
- `lib/auth/guards.ts` — `assertSelfOrAdmin`, `requireMatchParticipantOrAdmin`, etc.
- `lib/auth/dev-bypass.ts` — `DEV_BYPASS_ADMIN_AUTH` (admin only, dev only)
- `lib/auth/dev-test-login.ts` — `DEV_TEST_LOGIN_ENABLED` (dev only)
- `app/api/auth/verify/route.ts`, `app/api/auth/logout/route.ts`
- `components/auth/AppSessionProvider.tsx`
- `lib/contexts/WaaPProvider.tsx` — logout must clear SIWE first

**Audit**

- `prisma/schema.prisma` — `ClinicalAccessLog`, `ClinicalResource` enum
- `lib/clinical-audit.ts` — `recordClinicalAccess()`
- Already wired: `app/api/profile/route.ts` (read/upsert)

**Clinical / PHI routes (inventory starting point — expand during 9.3a)**

- `app/api/profile/**` — profile, avatar, documents, intro video
- `app/api/matching/**` — matches, PSM roster with patient context
- `app/api/journal/**` or bitácora equivalents
- `app/api/admin/**` — PSM verification, sessions, matches
- `app/api/storage/**` or upload paths for cédula/título

**UI routes needing idle timeout (9.3c)**

- `/perfil`, `/bitacora`, `/mis-usuarios`, `/supervision`, `/admin/**`, `/videochat`

## 4. Acceptance criteria (Given / When / Then)

### 9.3a — Route auth audit

1. **Given** an inventory spreadsheet of `app/api/**` routes, **when** reviewed, **then** every route touching user PHI is tagged `public | session | self | admin | match-participant`.
2. **Given** a non-admin session for user A, **when** `GET /api/profile` is called with user B's id/email/identity, **then** response is 403.
3. **Given** no session cookie, **when** any PHI route is called, **then** response is 401 (not empty 200).

### 9.3b — Audit coverage

4. **Given** a successful profile read, **when** the request completes, **then** a `clinical_access_logs` row exists with `action=read`, `resource=profile`, correct `actorUserId` and `targetUserId`.
5. **Given** document upload or signed URL generation, **when** successful, **then** audit row with `resource` matching document type.
6. **Given** admin views PSM verification documents, **when** successful, **then** audit row with `reason` indicating admin review.

### 9.3c — Session hardening

7. **Given** user A on `/perfil`, **when** user logs out and user B logs in without reload, **then** no name/email/wallet/avatar from A is shown.
8. **Given** clinical page idle > configured threshold (e.g. 30 min), **when** user returns, **then** SIWE re-verification is required before PHI loads.
9. **Given** logout, **when** wallet disconnects, **then** `motus_session` cookie is cleared before or synchronously with wallet state reset.

### 9.3d — Prod guardrails

10. **Given** Vercel production environment, **when** `DEV_BYPASS_ADMIN_AUTH=1` or `DEV_TEST_LOGIN_ENABLED=1`, **then** CI/deploy check fails.
11. **Given** `NODE_ENV=production`, **when** `isDevAdminBypassEnabled()` or `isDevTestLoginEnabled()` is evaluated, **then** always false regardless of env var.

### 9.3e — Compliance runbooks

12. **Given** `docs/runbooks/clinical-data-handling.md`, **when** read by a new engineer, **then** it lists: data categories, retention, who can access what, minimization rules.
13. **Given** `docs/runbooks/breach-response.md`, **when** incident occurs, **then** steps cover: contain, assess scope, notify (LFPDPPP 72h / HIPAA where applicable), rotate keys.
14. **Given** vendor checklist, **when** reviewed, **then** Supabase, Vercel, Stripe, Jitsi (if used) have BAA/DPA status documented.

## 5. Data / schema changes

| Change | Notes |
|--------|-------|
| Optional: `ClinicalAccessLog.reason` enum tighten | If free-text `reason` is too loose for reporting |
| Optional: `Session` or cookie metadata for idle tracking | May be cookie-only + client ping — avoid schema if possible |
| No PHI in new tables | Audit log stores ids + action, not clinical content |

Migration: only if enum/table changes; include rollback note in PR.

## 6. API contract (if any)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/logout` | optional | Must clear `motus_session` httpOnly cookie |
| GET | `/api/auth/me` | session | Returns session identity for idle checks |
| * | PHI routes | per 9.3a inventory | All must call guards + audit per 9.3b |

## 7. QA gate (Definition of Done for this slice)

- [ ] Sub-slices 9.3a–9.3e acceptance criteria pass (or explicitly deferred with owner sign-off).
- [ ] `npm run lint` and `npx tsc --noEmit` pass.
- [ ] Manual test: two-account switch on `/perfil` — no stale PHI.
- [ ] `git ls-files` / Vercel env review: no dev bypass vars in prod.
- [ ] Route inventory committed to `docs/architecture/api-auth-inventory.md` (or appendix in this spec).
- [ ] Non-goals respected.

## 8. Exit conditions (when the loop stops)

**Minimum viable (ship before clinical GA marketing):** 9.3c + 9.3d + criteria 1–3 + 7 + 10–11 green.

**Full exit:** all criteria 1–14 green + runbooks reviewed by product/legal contact.

## 9. Decisions — LOCKED

1. **SIWE remains canonical** — no parallel Supabase Auth for Hub users in this slice.
2. **Dev bypasses are dev-only** — never feature-flagged on in production.
3. **Encryption at rest** — rely on Supabase Postgres + Storage provider defaults; document in runbook, do not re-implement.
4. **Session TTL default after 9.3c:** target 24h absolute max, 30min idle on clinical routes (tune with product).
5. **LFPDPPP primary, HIPAA where US therapists/patients** — legal review out of scope; runbooks are engineering checklists not legal advice.

---

*Child spec · Parent: `platform-harmonize.md` §9 · MotusDAO Hub*
