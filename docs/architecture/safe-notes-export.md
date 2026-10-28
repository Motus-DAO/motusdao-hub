# Bitácora export format and key recipe

Public reference for **chat-data slice 1** and SDD-chat-data §4. Psychat archive (`motus-psychat-archive`) will reuse the same envelope in slice 2 with a different `purpose`.

## File format (`motus-safe-notes-export` v1)

JSON object:

| Field | Meaning |
|-------|---------|
| `format` | Always `motus-safe-notes-export` |
| `version` | `1` |
| `exportedAt` | ISO timestamp of export |
| `purpose` | `motus-safe-notes` |
| `keyVersion` | `1` |
| `eoaAddress` | Lowercased wallet address used as **AES-GCM additional authenticated data (AAD)** |
| `entries[]` | `{ id, ciphertext, iv, createdAt, updatedAt }` as stored server-side (base64) |

Motus does not include decrypted text in the file.

## Key recipe (unlock / decrypt)

1. **Not** the SIWE login signature.
2. Sign this exact message (newlines as shown), with the same wallet as `eoaAddress`:

```
Motus Hub — Bitácora (diario personal)
purpose: motus-safe-notes
keyVersion: 1
address: <lowercase eoaAddress>
```

3. `key = SHA-256(normalizedSignatureBytes)` imported as **AES-256-GCM** raw key.
4. For each entry: decrypt `ciphertext` with `iv`, AAD = UTF-8 bytes of lowercase `eoaAddress`.
5. Plaintext is JSON payload `{ v: 1, content, mood, tags }`.

Implementation: `lib/safe-notes/crypto.ts`, `lib/safe-notes/unlock-message.ts`.

## Opening on another device

Same wallet → same unlock message → same key → decrypt entries from the downloaded JSON. Import UI may be added later; decrypting offline is possible with this doc + Web Crypto.
