# Chat-data slice 6 — Data key mode (cuenta vs wallet) — Psychat + bitácora

> **Status:** **LOCKED** (SDD) · **not shipped** · Owner: product + eng  
> **Last updated:** 2026-11-17  
> **Parent:** [chat-data-roadmap.md](./chat-data-roadmap.md) · [identity-waap-thirdweb-siwe-multilink.md](./identity-waap-thirdweb-siwe-multilink.md) · [SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §2–4  
> **Motivation:** Infra Motus **provider-agnostic** (Human / Thirdweb / external). Multilink es identidad; el cifrado local debe poder seguir la **cuenta** por defecto, con opción avanzada **por wallet (EOA)**.

**Rollback baseline (pre-slice):** tag `chat-data-baseline-pre-account-key-mode-2026-11-17` @ `d038356` (crear antes del primer commit de implementación).

---

## 1. One-liner

Un **modo de llave de datos** compartido por **Psychat archive** y **bitácora (safe-notes)**: por defecto desbloquear con **cualquier wallet vinculada** a la cuenta SIWE; opción avanzada **solo esta EOA** (comportamiento actual). Cambio de modo exige **re-cifrado explícito**.

---

## 2. Goals / non-goals

### In

- Preferencia usuario: `account` | `wallet` (misma preferencia para Psychat archive **y** bitácora).
- Mensajes de unlock y AAD **versionados** (`keyVersion` 2) sin romper v1 (solo EOA).
- Metadata en servidor y en export JSON (`dataKeyMode`, `keyVersion`, `walletEoa` cuando aplique).
- UX: elección al activar copia / primera unlock; avisos de seguridad; migración asistida entre modos.
- Alinear copy con [platform-harmonize.md](./platform-harmonize.md) P0 identidad multilink.

### Out

- Motus leyendo plaintext en servidor (sigue ciphertext-only).
- Llaves custodiadas por Motus o recuperación sin firma de wallet.
- Modos distintos para Psychat vs bitácora (un solo toggle de cuenta).
- Rebind automático al vincular wallet sin consentimiento (cambiar modo = flujo dedicado).
- Enclave / RootRouter / FHIR / training copy.

---

## 3. Threat model (resumen para UI)

| Modo | Quién puede desbloquear | Riesgo principal |
|------|-------------------------|------------------|
| **`account` (default)** | Cualquier **wallet vinculada** + sesión SIWE válida + firma unlock | Comprometer **cualquiera** de las wallets vinculadas ≈ acceso a ciphertext de esa cuenta (cliente). |
| **`wallet` (avanzado)** | Solo la **EOA** que firmó al cifrar (AAD = esa address) | Pérdida de acceso al cambiar de proveedor/EOA sin export ni EOA original. |

**Igual en ambos:** el servidor solo almacena ciphertext; CELO/on-chain **no** se mezcla con estas llaves.

---

## 4. Modos (locked)

### 4.1 `account` (recomendado · default)

- **Unlock message** (nuevo purpose, **sin** línea `address:` por EOA):

```text
Motus Hub — llave de datos de cuenta
purpose: motus-account-data
keyVersion: 2
userId: <cuid>
```

- Firma: cualquier wallet que pase `sessionOwnsSpendAddress` / esté en `LinkedWallet` para ese `userId`.
- **AAD (AES-GCM):** `userId` (UTF-8), no EOA.
- Derivación de AES key: `SHA-256(signature)` → import AES-GCM (igual que v1).

### 4.2 `wallet` (avanzado · comportamiento actual v1)

- Mensajes existentes:
  - Bitácora: `motus-safe-notes` ([lib/safe-notes/constants.ts](../lib/safe-notes/constants.ts))
  - Psychat archive: `motus-psychat-archive` ([lib/psychat-archive/constants.ts](../lib/psychat-archive/constants.ts))
- **AAD:** `eoaAddress` lowercased (como hoy).
- Solo la wallet conectada que coincide con AAD / firma puede desencriptar.

---

## 5. Persistencia

### 5.1 Perfil / usuario (Prisma)

Campos nuevos en `User` (nombres orientativos — migración en implementación):

| Campo | Tipo | Notas |
|-------|------|--------|
| `dataKeyMode` | `account` \| `wallet` | Default **`account`** para usuarios nuevos post-migración |
| `dataKeyVersion` | `Int` | `1` = legacy wallet-only implícito; `2` = modo explícito |
| `dataKeyWalletEoa` | `String?` | Última EOA usada al cifrar en modo `wallet`; null en `account` |

### 5.2 Snapshots / filas cifradas

- `PsychatArchiveSnapshot`: añadir `dataKeyMode`, `keyVersion` (metadata; no sustituye ciphertext).
- Bitácora (filas cifradas): mismo metadata por fila **o** solo a nivel usuario si todas las notas comparten modo (preferir **nivel usuario** + validar en PUT).

### 5.3 Export JSON

Extender formatos existentes (`motus-safe-notes-export`, `motus-psychat-archive-export`) con:

```json
{
  "dataKeyMode": "account",
  "dataKeyVersion": 2,
  "walletEoa": null
}
```

Regla: export sin campo = asumir **wallet v1** + `eoaAddress` del paquete.

---

## 6. User experience

### 6.1 Dónde se elige

- **Perfil** → sección “Privacidad de datos” (nuevo bloque o dentro de wallets).
- **Primera activación:** Psychat archive opt-in o primera unlock bitácora → modal corto con dos tarjetas:
  - **Por mi cuenta Motus (recomendado)** — cualquier wallet vinculada.
  - **Solo esta wallet** — aviso ámbar.

### 6.2 Copy (ES, locked intent)

- Cuenta: “Si Human o Thirdweb falla, otra wallet vinculada puede abrir tu copia. Cualquier wallet vinculada comprometida puede desbloquear estos datos.”
- Wallet: “Máxima separación por dirección. Si cambias de wallet sin exportar, no podrás abrir esta copia.”

### 6.3 Cambiar de modo

1. Usuario elige nuevo modo → **debe** desbloquear con modo actual.
2. Cliente descifra → re-cifra con nuevo purpose/AAD → PUT al servidor.
3. Bitácora: iterar filas o batch API (definir en implementación; preferir una transacción lógica por usuario).
4. Si falla a mitad: no cambiar `User.dataKeyMode` hasta éxito completo.

### 6.4 Legacy (usuarios con datos v1)

- `dataKeyVersion = 1` o ausencia de `dataKeyMode` → tratar como **`wallet`** con EOA inferida del primer unlock / `dataKeyWalletEoa` / AAD de filas existentes.
- Oferta one-time en UI: “Pasar a modo cuenta (recomendado)” → flujo §6.3.

---

## 7. APIs (delta)

| Method | Path | Cambio |
|--------|------|--------|
| `GET` | `/api/profile` | Exponer `dataKeyMode`, `dataKeyVersion` (no secretos) |
| `PATCH` | `/api/profile/data-key-mode` | Body `{ mode }` — solo inicia migración o guarda preferencia **sin** datos pendientes; o devuelve `409` si hay ciphertext y exige flujo cliente |
| Existentes | `/api/psychat/archive`, bitácora APIs | Aceptar `keyVersion` + rechazar mismatch modo/ciphertext |

Validación servidor: ciphertext PUT debe coincidir con `dataKeyMode` del usuario (evitar mezclar modos sin migración).

---

## 8. Implementation anchors

| Área | Archivos |
|------|----------|
| Crypto compartido | `lib/safe-notes/crypto.ts`, `lib/psychat-archive/crypto.ts` |
| Unlock hooks | `lib/psychat-archive/use-psychat-archive-key.ts`, bitácora unlock equivalente |
| Mensajes | `lib/safe-notes/unlock-message.ts` (nuevo account), `lib/psychat-archive/unlock-message.ts` |
| Multilink | `lib/auth/linked-wallets.ts`, `lib/auth/session.ts` |
| UI Perfil | `app/perfil/page.tsx` |
| UI Psychat | `PsychatArchiveUnlockGate`, `PsychatArchivePanel` |
| UI Bitácora | `app/bitacora/*` unlock gate si existe |

---

## 9. Delivery phases

| Phase | ID | Entregable |
|-------|-----|------------|
| **CD6-0** | SDD | Este doc + tag baseline + STATUS |
| **CD6-1** | Schema + constants v2 | Prisma, purposes, `buildAccountDataUnlockMessage` |
| **CD6-2** | Unlock client | Account mode en Psychat + bitácora; tests crypto |
| **CD6-3** | Profile UX + PATCH | Elegir modo, avisos, default `account` for new |
| **CD6-4** | Migration UX | v1 → account/wallet; export metadata |
| **CD6-5** | Docs + privacy | `docs/architecture/*`, un párrafo en aviso privacidad |

**DoD:** usuario en staging con 2 wallets vinculadas desbloquea Psychat archive y bitácora en modo `account` desde cualquiera; usuario en modo `wallet` no abre con la otra EOA; export/import conserva `dataKeyMode`.

---

## 10. Acceptance criteria

1. **Given** usuario nuevo, **when** activa archive o bitácora, **then** default ofrecido = `account` con copy de multilink.
2. **Given** modo `account` y 2 wallets vinculadas, **when** unlock con wallet B, **then** descifra lo cifrado con wallet A.
3. **Given** modo `wallet`, **when** unlock con wallet B (misma cuenta), **then** falla decrypt (test + manual).
4. **Given** legacy v1 sin metadata, **when** unlock, **then** comportamiento idéntico al shipped actual (wallet/EOA).
5. **Given** cambio de modo, **when** migración incompleta, **then** `dataKeyMode` en DB sin cambiar; sin corrupción de ciphertext.
6. **Given** export, **when** parse, **then** incluye `dataKeyMode` y `dataKeyVersion` en v2.
7. **Negative:** **given** wallet no vinculada, **when** intenta unlock account mode, **then** 403 / fallo cliente sin derivar llave.

---

## 11. QA gate

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
npx prisma validate
# targeted:
npx tsx --test lib/psychat-archive/crypto.test.ts lib/safe-notes/*.test.ts lib/account-data-key*.test.ts
```

---

## 12. Rollback

1. Tag antes del primer merge de implementación: `chat-data-baseline-pre-account-key-mode-2026-11-17`.
2. Si prod falla post-deploy: revert merge commit **o** `git checkout` del tag + redeploy Vercel.
3. Migración Prisma reversible: nuevas columnas nullable; rollback de código puede ignorar columnas.
4. Usuarios que migraron a v2: ciphertext v2 sigue en DB — no rollback destructivo sin script (documentar en runbook si CD6-4 shipped).

---

## 13. Change log

| Date | Change |
|------|--------|
| 2026-11-17 | Initial SDD — account default, wallet advanced, Psychat + bitácora unified |