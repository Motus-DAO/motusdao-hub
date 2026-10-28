# Chat-data slice 1 — Bitácora export — Spec

> Status: **IN PROGRESS** · Owner: product · 27 Oct 2026
>
> Purpose: portable **ciphertext** package + published key recipe so the same wallet opens entries on another device. Motus still cannot read bodies.
>
> Roadmap: [chat-data-roadmap.md](./chat-data-roadmap.md) · Plan: [docs/specs/SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §4 step 3.

---

## 1. Scope

- `motus-safe-notes-export` JSON v1 (`lib/safe-notes/export-format.ts`).
- Public recipe: [docs/architecture/safe-notes-export.md](../docs/architecture/safe-notes-export.md).
- `/bitacora` button **Exportar copia cifrada** (server ciphertext, not re-encrypted in UI).
- No import UI in this slice (decrypt offline with doc + Web Crypto).

## 2. Non-goals

- Psychat archive (`motus-psychat-archive`) — slice 2.
- FHIR, training copy, RootRouter, enclaves.
- Decrypted export or Motus-held keys.

## 3. Acceptance criteria

1. **Given** unlocked bitácora with ≥1 encrypted row, **when** export runs, **then** downloaded JSON has `format`, `purpose`, `keyVersion`, `eoaAddress`, and entries with `ciphertext`+`iv` only.
2. **Given** the export file, **when** a third party opens it, **then** they see no plaintext journal sentences.
3. **Given** the same wallet on another browser, **when** they use the key recipe on an entry from the file, **then** plaintext matches the original save.

## 4. QA gate

- [x] `lib/safe-notes/export-format.test.ts`
- [x] `npm run lint` / `npx tsc --noEmit`

## 5. Exit

Next: [chat-data-slice-2-psychat-archive-export.md](./chat-data-slice-2-psychat-archive-export.md) (stub until slice 1 ships).
