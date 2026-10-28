# Safety slice 7 — Bitácora ciphertext — Spec

> Status: **SHIPPED (local)** · Owner: product · 27 Oct 2026
>
> Purpose: journal bodies are AES-GCM ciphertext in Postgres; only the owner’s wallet (second signature) can decrypt. Motus and admins see metadata only.
>
> Plan: [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md) slice 7 · Key recipe: [docs/specs/SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §3–4.

---

## 1. Scope

- `app/bitacora/page.tsx` uses SIWE `userId`, session cookies, unlock signature, client encrypt/decrypt.
- Copy: personal diary, not expediente clínico; matched PSM cannot read; lost wallet key = lost journal.
- `lib/safe-notes/*` — purpose `motus-safe-notes`, `keyVersion` 1, AAD = lowercased EOA, Web Crypto AES-GCM.
- `journal_entries`: `ciphertext`, optional `iv`, `keyVersion`; no `mood` / `tags` columns (inside encrypted JSON).
- `POST` / `PUT` accept ciphertext + iv only. `GET` returns ciphertext to **owner**; **admin listing another user** returns id + timestamps only.
- **Legacy plaintext rows:** migration wraps old `content` + mood/tags into a JSON string in `ciphertext` with `iv = null`. Owner re-encrypts on first unlock via `PUT` (one-time migration).

## 2. Non-goals

- Share-with-therapist, recovery key held by Motus, export button (chat-data step), Psychat archive key.
- Encrypting perfil, intake, or matches.

## 3. Anchors

- `lib/safe-notes/crypto.ts`, `unlock-message.ts`, `use-safe-notes-key.ts`
- `app/api/bitacora/route.ts`, `app/bitacora/page.tsx`
- `prisma/schema.prisma` — `JournalEntry`

## 4. Acceptance criteria

1. **Given** a signed-in user, **when** they save an entry, **then** Postgres stores only base64 ciphertext + iv (no sentence they typed in clear).
2. **Given** another user’s session, **when** they `GET` the first user’s notes, **then** 403.
3. **Given** an admin session for a **different** user, **when** they list notes, **then** response entries omit ciphertext/iv.
4. **Given** the same wallet on a second browser, **when** they sign the unlock message, **then** entries decrypt.
5. **Given** ciphertext from account A, **when** account B decrypts with their key, **then** decryption fails.
6. **Given** the user rejects the unlock signature, **when** the page settles, **then** no note plaintext is shown.

## 5. Rollback

- Revert migration only if no production ciphertext rows exist. Otherwise restore from backup; do not re-add plaintext `content` column without legal review.

## 6. QA gate

- [x] `lib/safe-notes/crypto.test.ts`
- [x] `npm run lint` / `npx tsc --noEmit`

## 7. Manual verification (post-save)

**A — Postgres (Supabase SQL):** the sentence you typed must not appear in clear.

```sql
SELECT id, LEFT(ciphertext, 80) AS blob, iv, key_version
FROM journal_entries
ORDER BY "createdAt" DESC
LIMIT 5;
```

Expect base64-like `ciphertext`, 12-byte IV as base64, `iv` not null on new rows.

**B — Browser Network:** `POST /api/bitacora` body has `ciphertext` + `iv` only (no `content`). Response same.

**C — Console (owner, after unlock):** DevTools must not log decrypted text; if you need a one-off check, after unlock:

```js
// Network tab → copy ciphertext from GET /api/bitacora — should not contain your sentence as substring
fetch('/api/bitacora?userId=YOUR_USER_ID', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log(d.entries[0]?.ciphertext?.includes('tu frase secreta')))
// expect false
```

**D — Admin metadata:** as platform admin, `GET /api/bitacora?userId=<otherUser>` returns entries without `ciphertext` / `iv`.

**E — Unit tests:** `node --import tsx --test lib/safe-notes/crypto.test.ts`

**Not in scope for this slice:** public URL leak scan (bitácora requires SIWE + unlock); export package is chat-data step 3.

## 8. Exit conditions

Slice 7 stops here. Next plan work: [docs/specs/SDD-chat-data.md](../docs/specs/SDD-chat-data.md) (export button, Psychat archive key, etc.). Update [docs/compliance/pendientes-post-beta.md](../docs/compliance/pendientes-post-beta.md) aviso copy when product claims “Motus cannot read journal” in production.
