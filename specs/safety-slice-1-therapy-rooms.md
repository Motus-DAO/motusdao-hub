# Safety slice 1 — Therapy rooms stay on the private Jitsi — Spec

> Status: **SHIPPED** on `main` at `9e99066` · Owner: product · 22 Oct 2026 · Slice size: ≤1 day
>
> Purpose: a therapy room in the Hub cannot be opened on public `meet.jit.si` or on the open meeting host by someone who only knows the room name. The link is `jitsi.motusdao.org`. The Hub will not open that room without its own token, and a guest token is never minted for an office or clinical room.
>
> Plan: [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md) slice 1. This slice does not reopen that plan. Chat ownership stays in [docs/specs/SDD-chat-data.md](../docs/specs/SDD-chat-data.md) and does not start here.
>
> The two servers are already split. This slice does not move them.
>
> - `jitsi.motusdao.org` on `vps-motusdao` is the private Jitsi. `ENABLE_GUESTS=0`, `JWT_ALLOW_EMPTY=0`. It checks Hub tokens. It does not create them.
> - `meet.motusdao.org` and `metaverso.motusdao.org` on `vps-brahma` are not therapy.

---

## 1. Scope (what this slice delivers)

A matched therapy room is a Hub room on the private server, and the app refuses to send it anywhere else.

- Office rooms (`motusdao-office-{matchId}`) and clinical rooms (`motusdao-sess-{sessionId}`) are built only as `https://jitsi.motusdao.org/{room}`.
- A missing `NEXT_PUBLIC_JITSI_DOMAIN`, or one set to `meet.jit.si`, does not change that host.
- `/videochat` rewrites a pasted therapy URL onto `jitsi.motusdao.org` and does not start Jitsi, or open a native meeting window, unless the Hub has issued a JWT for that room.
- `POST /api/jitsi/guest-token` returns 403 for an office room, a clinical room, and a quick room while quick rooms are off. It does not sign those rooms.
- `POST /api/jitsi/token` for an office room stays 403 unless the caller is the matched patient, that match's PSM, or an admin.
- A new therapy session stores `buildOfficeJitsiUrl`. A client-supplied `externalUrl` cannot point the row at `meet.jit.si`.
- The admin session list opens that stored link through `/videochat`, so an old `meet.jit.si` row is rewritten and still needs a Hub token. Existing rows are not rewritten in the database.
- Open, quick, and metaverse room links use only `meet.motusdao.org`. Their tokens use the open secret, never the therapy secret.
- Both domains, both secrets, and the fail-closed rule are written in `docs/runbooks/VERCEL_VIDEOCHAT_ENV.md`.

## 2. Non-goals (explicitly out of scope)

- Slice 2 and later. No Psychat, onboarding, inbox, faucet, admin session, privacy notice, Bitácora, encryption, export, FHIR, training consent, RootRouter proxy, or enclave.
- Do not move Jitsi, LiveKit, or WorkAdventure between `vps-motusdao` and `vps-brahma`. Do not edit DNS.
- No Jitsi branding change. No therapy inside WorkAdventure. No `jitsiUrl` from the map to the private server.
- No Supabase usernames for metaverse consultorios.
- No change to `app/psychat/page.tsx`. It may keep importing `buildVideochatUrl`.
- No Prisma migration.

## 3. Context / anchors

- `lib/jitsi.ts` — room class picks the host. Therapy is `jitsi.motusdao.org`. Open meetings are `meet.motusdao.org`. `getJitsiDomain()` does not read `NEXT_PUBLIC_JITSI_DOMAIN`.
- `lib/jitsi-policies.ts` — office access is patient, that match's PSM, or admin. `decideOfficeRoomAccess` is the check the route uses after it loads the match.
- `lib/jitsi-token.ts` — therapy rooms sign with `JITSI_APP_SECRET`. Every other room signs with `JITSI_OPEN_APP_SECRET`. A guest signature calls `refuseGuestToken` first.
- `app/api/jitsi/token/route.ts` — session required; 403 when `authorizeJitsiRoomAccess` denies.
- `app/api/jitsi/guest-token/route.ts` — no session. Office, clinical, metaverse, unknown, and disabled quick rooms return 403 before any signature.
- `app/videochat/page.tsx` — `resolveVideochatRoom` replaces the pasted host. The embed and the native window call `canOpenJitsiMeeting`, which requires the room's host and a non-empty Hub JWT.
- `app/api/sessions/route.ts` — stored `externalUrl` is `therapySessionExternalUrl`. The body value is ignored.
- `app/admin/sesiones/page.tsx` — the session link opens `/videochat`, and the label is the rewritten host.
- `docs/runbooks/VERCEL_VIDEOCHAT_ENV.md` — both domains, both secrets, fail closed.
- `jitsi/docker-compose.yml`, `jitsi/env.example` — private-stack default `ENABLE_GUESTS=0` and `JWT_ALLOW_EMPTY=0`. This file is not the open server.

## 4. Acceptance criteria (Given / When / Then)

1. **Given** a production-like env with no `NEXT_PUBLIC_JITSI_DOMAIN`, **when** the app builds an office or clinical room URL, **then** the host is `jitsi.motusdao.org` and the URL does not contain `meet.jit.si`. The same holds when that variable is `meet.jit.si`.
2. **Given** a therapy room name and no Hub JWT, **when** the client asks to open the media server (embed or native window), **then** the Hub refuses. A therapy URL whose host is `meet.jit.si` or `meet.motusdao.org` is rewritten to `jitsi.motusdao.org` before that check. The private server remains `ENABLE_GUESTS=0` and `JWT_ALLOW_EMPTY=0`; this slice does not SSH to it.
3. **Given** quick rooms disabled, **when** `POST /api/jitsi/guest-token` is called for a quick room, **then** the response is 403 and no JWT is signed.
4. **Given** an office room, **when** a caller who is not the patient, the PSM of that match, or an admin asks for a token, **then** the response is 403.
5. **Negative path:** **given** an office or clinical room name, **when** `POST /api/jitsi/guest-token` is called, **then** the response is 403 and the therapy secret is not used.
6. **Given** an open, quick, or metaverse room, **when** the app builds its URL, **then** the host is `meet.motusdao.org` and not `jitsi.motusdao.org` or `meet.jit.si`. A token for that room is signed only with the open secret. If that secret is missing or equal to the therapy secret, the route fails and does not fall back.

## 5. Data / schema changes

- Prisma model deltas: none.
- Migration: none.
- Seed impact: none.
- `Session.externalUrl` for a newly created therapy session is the office URL on `jitsi.motusdao.org`. Existing rows are not migrated. `/videochat` rewrites a therapy room onto that host when the link is opened.

## 6. API contract (if any)

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/jitsi/token` | SIWE session | `{ roomName, userId? }` | `{ success, token, kind, moderator }` or 403 | Office: patient, match PSM, or admin. Therapy rooms signed with `JITSI_APP_ID` / `JITSI_APP_SECRET`. Open, quick, and metaverse signed with `JITSI_OPEN_APP_ID` / `JITSI_OPEN_APP_SECRET` only. |
| POST | `/api/jitsi/guest-token` | Public | `{ roomName, displayName }` | 403 for office, clinical, unknown, metaverse, and quick rooms while `NEXT_PUBLIC_JITSI_QUICK_ROOMS` is not `true` | Allowed only for open rooms and enabled quick rooms. Open secret only. |
| POST | `/api/sessions` | Existing guard | `{ userId, externalUrl? }` | Session row | Stored `externalUrl` is `buildOfficeJitsiUrl(matchId)`. The body value is ignored. |

## 7. QA gate (Definition of Done for this slice)

- [x] All acceptance criteria above pass (mapped to checks/tests).
- [x] `npm run lint` passes on the files this slice touches.
- [x] `npx tsc --noEmit` passes.
- [x] At least one negative-path check exists.
- [x] Migration + rollback note present (if schema changed). No schema change.
- [x] Evidence: `lib/jitsi-safety.test.ts` (8 tests), guest-token 403 for office and clinical, `/videochat` rewrites `meet.jit.si` to `jitsi.motusdao.org` and does not embed without a wallet.
- [x] Non-goals respected. Slice 2 does not start.

Mapped checks, in `lib/jitsi-safety.test.ts`:

| AC | Check |
|----|--------|
| 1 | `buildOfficeJitsiUrl` / `buildJitsiUrl` with the domain env unset and set to `meet.jit.si` |
| 2 | `canOpenJitsiMeeting` without a JWT; `resolveVideochatRoom` rewrites a public or open host |
| 3 | `refuseGuestToken` for a quick room while quick rooms are off |
| 4 | `decideOfficeRoomAccess` for a stranger, and the token route's existing 403 when `allowed` is false |
| 5 | `refuseGuestToken` for office and clinical names; `signJitsiGuestToken` also refuses a metaverse room |
| 6 | `buildOpenJitsiUrl` host; `readJitsiSigningKey` rejects a missing or identical secret; `signJitsiAccessToken` rejects a therapy room signed with the open secret |

## 8. Exit conditions (when the loop stops)

The loop ends when: **all acceptance criteria pass AND the QA gate is green AND no open critical findings.** If `loop_limit` is hit first, escalate to a human with the latest failure summary.

This slice stops here. Slice 2 does not start.

## 9. Decisions — LOCKED

1. Therapy host is the constant `jitsi.motusdao.org`. Open-meeting host is the constant `meet.motusdao.org`. `meet.jit.si` is never a meeting host. `NEXT_PUBLIC_JITSI_DOMAIN` is not read to choose a host. A missing variable cannot fall through to the public server.
2. Room class decides the host. Office and clinical are therapy. Open (`motusdao-open-`), quick (`motusdao-quick-`), and metaverse (`motusdao-meta-`) are not. An unknown room name produces no URL and no embed.
3. The Hub opens a Jitsi meeting only when the host matches that class and a non-empty JWT is present. The JWT in a pasted URL is not that token. The page fetches `/api/jitsi/token` or `/api/jitsi/guest-token`.
4. Guest tokens are never signed for office, clinical, metaverse, or unknown rooms. Quick rooms stay behind `NEXT_PUBLIC_JITSI_QUICK_ROOMS=true`.
5. Therapy tokens use `JITSI_APP_SECRET`. Every other Hub-minted Jitsi token uses `JITSI_OPEN_APP_SECRET`. The open secret must be set and must differ from the therapy secret. There is no fallback from one secret to the other.
6. `jitsi/docker-compose.yml` is the private stack. Its default `ENABLE_GUESTS` becomes `0`, matching the server that is already running. This slice does not recreate containers.
7. `metaverso.motusdao.org` stays the WorkAdventure world on `vps-brahma`. This slice does not point it at the private Jitsi.
