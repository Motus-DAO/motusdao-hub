# Chat-data slice 2 — Psychat archive + export — Spec

> Status: **SHIPPED** on `main` · initial `a5aecb2` · prod UX hardening `2926dbc` · 28 Oct 2026
>
> Plan: [SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §2.2 + §4 · Roadmap: [chat-data-roadmap.md](./chat-data-roadmap.md).

Deliver: opt-in toggle (**off by default**), one ciphertext snapshot per user in Postgres (`motus-psychat-archive` unlock), debounced save, export package, recover + **open in chat**, sidebar sessions UX, user help (archive + TEE/E2EE) — **bitácora key must not open archive**.

Non-goals: FHIR summary, training copy, RootRouter, enclaves, plaintext on server, **multiple named snapshots per account** (use export `.json` for extra backups).

---

## 1. Scope

- Prisma: `consentToPsychatArchive`, `PsychatArchiveSnapshot` (**one row per `userId`**), audit resource `psychat_archive` (migration `20261028043000_psychat_archive`).
- Crypto: `lib/psychat-archive/*` — separate unlock message vs bitácora.
- API: `/api/consent/psychat-archive`, `/api/psychat/archive` (GET/PUT/DELETE).
- UI: `PsychatArchivePanel` (visual save states), `PsychatSessionsSidebar` (open account copy, open local `.json`, delete account copy), `PsychatArchiveKeyProvider`, `onMessagesChange` on `AnimatedAIChat`.
- Client sync: `motus-psychat-archive-changed` event after PUT/DELETE/restore so sidebar refetches without full page reload.
- Help: `/psychat/archivo` — `PsychatArchiveHelp` + `PsychatInferencePrivacyHelp`; `/psychat/archivo/recuperar` — preview, **Abrir en Psychat**, guardar en cuenta.
- Plain-language copy: `psychatCopy` in constants (no “servidor” in user strings).
- Docs: [docs/architecture/psychat-archive-export.md](../docs/architecture/psychat-archive-export.md).

## 2. Anchors

- `components/psychat/PsychatSessionsSidebar.tsx`, `PsychatArchivePanel.tsx`, `PsychatArchiveHelp.tsx`, `PsychatInferencePrivacyHelp.tsx`
- `lib/psychat-archive/client.ts` (`notifyPsychatArchiveChanged`, `deletePsychatArchiveOnServer`)
- `lib/psychat-archive/chat-session-bridge.ts`, `load-archive.ts`, `export-format.ts`, `restore-from-export.ts`
- `app/psychat/page.tsx`, `app/psychat/archivo/page.tsx`, `app/psychat/archivo/recuperar/page.tsx`

## 3. Acceptance criteria

1. **Given** a signed-in user, **when** they open Psychat, **then** archive opt-in is **unchecked** until they enable it.
2. **Given** opt-in off, **when** they chat, **then** no `psychat_archive_snapshots` row is written.
3. **Given** opt-in on + archive unlock + ≥2 messages, **when** they wait or tap “Guardar copia ahora”, **then** PUT stores ciphertext+iv only; panel shows saving/saved states; sidebar lists “Copia en tu cuenta Motus” **without reload**.
4. **Given** bitácora unlock key, **when** applied to archive ciphertext, **then** decrypt fails (unit test).
5. **Given** a saved snapshot, **when** export runs, **then** JSON has `format: motus-psychat-archive-export` and `snapshots[]` (typically one blob; each new save **replaces** the account row).
6. **Given** export file + archive unlock, **when** user uses recuperar or sidebar, **then** preview decrypt works and thread opens in chat; PUT restore to account works with opt-in on.
7. **Given** user disables opt-in, **when** POST `enabled: false`, **then** server snapshot is deleted and sidebar clears the account row.
8. **Given** `/psychat/archivo`, **when** read, **then** separate sections for who can / cannot read archive, plus LLM inference and TEE vs E2EE.
9. **Given** a saved account copy, **when** user confirms delete in sidebar (trash) or DELETE API, **then** snapshot is removed; chat on screen is unchanged; opt-in checkbox may stay on.
10. **Given** user opens a local `.json`, **when** they do not export it, **then** it appears only under **En pantalla** (not a second row in account copies); opening account copy or new chat switches what is on screen.

## 4. QA gate

- [x] `npx tsx --test lib/psychat-archive/crypto.test.ts lib/psychat-archive/export-format.test.ts`
- [x] `npx prisma migrate deploy` (migration `20261028043000_psychat_archive`)
- [x] `npx tsc --noEmit` (after `prisma generate`)
- [x] Prod smoke (28 Oct 2026): opt-in + unlock + save → panel “Copia guardada”; sidebar lists copy; open restores thread; export `.json` round-trip; trash removes account row.

## 5. What works (operator summary)

| Flow | Behavior |
|------|----------|
| Default | No cloud backup until user checks opt-in. |
| Unlock | Second wallet signature (`motus-psychat-archive` purpose), distinct from bitácora. |
| Auto-save | Debounced ~2.5s after ≥2 non-empty messages when opt-in + unlocked. |
| Manual save | “Guardar copia ahora” forces PUT of current on-screen messages. |
| Account storage | **One** ciphertext snapshot per Hub user; each save overwrites with full current thread. |
| Sidebar | “Copias para abrir” = account copy; “Abrir .json local” = ephemeral until re-opened; hint text explains single snapshot. |
| Delete | Trash → `DELETE /api/psychat/archive`; or disable opt-in → consent POST deletes row. |
| Export / recover | `.json` portable backup; recuperar page can preview, open in Psychat, or PUT back to account. |

## 6. Exit

Next: [chat-data-slice-3-consented-summary-fhir.md](./chat-data-slice-3-consented-summary-fhir.md) (TBD).
