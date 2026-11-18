# Account vs wallet data key (Psychat archive + bitácora)

Slice **chat-data 6** — unified client-side encryption preference for:

- Psychat archive snapshot (`psychat_archive_snapshots`)
- Bitácora journal rows (`journal_entries` / `motus-safe-notes`)

## Modes

| Mode | Unlock message purpose | AES-GCM AAD | `keyVersion` |
|------|------------------------|-------------|--------------|
| **account** (default for new users) | `motus-account-data` | `userId` (UTF-8) | `2` |
| **wallet** (legacy v1) | `motus-safe-notes` / `motus-psychat-archive` | lowercased EOA | `1` |

- **wallet:** `SHA-256(signature)` → AES-GCM key (v1).
- **account:** wallet must still sign the unlock message (authorization); AES key is
  `SHA-256(UTF-8 unlock message)` so every linked wallet derives the same key after signing.

Account unlock message (no `address:` line):

```text
Motus Hub — llave de datos de cuenta
purpose: motus-account-data
keyVersion: 2
userId: <cuid>
```

## Persistence

- `users.data_key_mode`, `users.data_key_version`, `users.data_key_wallet_eoa`
- `psychat_archive_snapshots.data_key_mode` (metadata alongside ciphertext)
- Export JSON may include `dataKeyMode`, `dataKeyVersion`, `walletEoa` (absent = legacy wallet export)

## Migration

Changing mode requires client-side decrypt → re-encrypt → PUT. `PATCH /api/profile/data-key-mode` with `migrationComplete: true` only after blobs are rewritten.

Rollback: schema columns are nullable/additive; pre-slice tag `chat-data-baseline-pre-account-key-mode-2026-11-17`.