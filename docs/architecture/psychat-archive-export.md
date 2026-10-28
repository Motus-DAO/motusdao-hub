# Psychat archive export format

Purpose string: **`motus-psychat-archive`** (not `motus-safe-notes`). A bitácora unlock key **cannot** decrypt this file.

## File format (`motus-psychat-archive-export` v1)

Same idea as [safe-notes-export.md](./safe-notes-export.md), with:

| Field | Value |
|-------|--------|
| `format` | `motus-psychat-archive-export` |
| `purpose` | `motus-psychat-archive` |
| `snapshots[]` | Export wraps the **single** account snapshot (`ciphertext`, `iv`, timestamps). Each PUT **replaces** the prior row — not a version history. |

## Unlock message

```
Motus Hub — Archivo Psychat (conversación guardada)
purpose: motus-psychat-archive
keyVersion: 1
address: <lowercase eoa>
```

Then SHA-256(signature) → AES-256-GCM; AAD = lowercase EOA. Inner plaintext JSON: `{ v, savedAt, messages: [{ role, content }] }`.

Implementation: `lib/psychat-archive/`.

## Product

- Opt-in **off** by default (`consentToPsychatArchive`).
- Visit thread still lives in the browser; archive is optional ciphertext in Postgres (**one row per user**).
- Sidebar listens for client event `motus-psychat-archive-changed` after PUT/DELETE/restore so the account copy row updates without reload.
- Delete account copy: sidebar trash → `DELETE /api/psychat/archive`, or disable opt-in (also stops auto-save).
- Local `.json` open is session-only in the UI (“En pantalla”); it is not a second persisted account snapshot unless the user PUTs or saves from Psychat.
