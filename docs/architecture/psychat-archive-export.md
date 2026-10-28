# Psychat archive export format

Purpose string: **`motus-psychat-archive`** (not `motus-safe-notes`). A bitácora unlock key **cannot** decrypt this file.

## File format (`motus-psychat-archive-export` v1)

Same idea as [safe-notes-export.md](./safe-notes-export.md), with:

| Field | Value |
|-------|--------|
| `format` | `motus-psychat-archive-export` |
| `purpose` | `motus-psychat-archive` |
| `snapshots[]` | One row per saved conversation blob (`ciphertext`, `iv`, timestamps) |

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
- Visit thread still lives in the browser; archive is optional ciphertext in Postgres.
