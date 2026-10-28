# Chat-data slice 1 — Bitácora export + recover UX — Spec

> Status: **SHIPPED** on `main` at `PLACEHOLDER` · Owner: product · 28 Oct 2026
>
> Purpose: portable **ciphertext** package, user-facing backup flow, and in-app **recover** so deleting entries on Motus does not strand the user with an opaque `.json` file. Motus still cannot read bodies without the wallet unlock key.
>
> Roadmap: [chat-data-roadmap.md](./chat-data-roadmap.md) · Plan: [docs/specs/SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §4 step 3.

---

## 1. Scope

- `motus-safe-notes-export` JSON v1 (`lib/safe-notes/export-format.ts`, tests).
- Technical recipe (auditors/devs): [docs/architecture/safe-notes-export.md](../docs/architecture/safe-notes-export.md).
- **`/bitacora`**: export button, links to help/recover (no repo-path markdown in UI).
- **`/bitacora/como-funciona`**: plain-language backup guide (`BitacoraBackupHelp`).
- **`/bitacora/recuperar`**: upload export → unlock → preview decrypt → **Restaurar en mi cuenta** (`lib/safe-notes/restore-from-export.ts`).
- Post-export alert reminding user to keep the file if they delete rows in Motus.

## 2. Non-goals

- Psychat archive — slice 2.
- FHIR, training copy, RootRouter, enclaves.
- Plaintext export or Motus-held recovery keys.
- Deduplication on restore (re-import may create duplicate rows; user can delete in UI).

## 3. Anchors

- `lib/safe-notes/export-format.ts`, `restore-from-export.ts`
- `components/bitacora/BitacoraBackupHelp.tsx`
- `app/bitacora/page.tsx`, `app/bitacora/recuperar/page.tsx`, `app/bitacora/como-funciona/page.tsx`

## 4. Acceptance criteria

1. **Given** unlocked bitácora with ≥1 encrypted row, **when** export runs, **then** downloaded JSON has `format`, `purpose`, `keyVersion`, `eoaAddress`, and entries with `ciphertext`+`iv` only.
2. **Given** the export file, **when** opened as raw JSON, **then** no plaintext journal sentences appear.
3. **Given** the same wallet and unlock signature, **when** the user uploads the file on `/bitacora/recuperar`, **then** preview shows the original entry text.
4. **Given** entries were deleted on Motus but the user still has the export, **when** they restore, **then** ciphertext rows exist again under their account (new server ids allowed).
5. **Given** a user on `/bitacora`, **when** they need help, **then** they reach `/bitacora/como-funciona` or `/bitacora/recuperar` without reading repo docs.

## 5. QA gate

- [x] `lib/safe-notes/export-format.test.ts`
- [x] `npm run lint` / `npx tsc --noEmit`

## 6. Exit

Next: [chat-data-slice-2-psychat-archive-export.md](./chat-data-slice-2-psychat-archive-export.md).
