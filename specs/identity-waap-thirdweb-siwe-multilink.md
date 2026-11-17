# Identity · WaaP + Thirdweb fallback · SIWE multi-wallet

**Status:** **active SDD** — **I1 shipped** on `main` @ `f053200`; I2–I5 pending  
**Surface:** Hub MotusDAO (`NEXT_PUBLIC_APP_URL`)  
**Last updated:** 2026-11-17  
**Rollback:** tag `identity-baseline-pre-waap-multiwallet-2026-11-17` → `9f1c22b` (docs-only delta on `main` after tag: `b6bfe01`)

**Supersedes (partially):** [auth-provider-agnostic.md](./auth-provider-agnostic.md) — slice A/B shipped; **Privy path is retired** in this program.  
**Related:** [safety-slice-3-onboarding-wallet.md](./safety-slice-3-onboarding-wallet.md) · [safety-slice-5-admin-session-audit.md](./safety-slice-5-admin-session-audit.md) · [founding-allowlist-usuario-psm.md](./founding-allowlist-usuario-psm.md) (admin SIWE unchanged) · [platform-harmonize.md](./platform-harmonize.md) § auth

**Anchors (today):**

- `lib/wallet/` — `getConfiguredWalletProvider()` → `waap` | `thirdweb` | `privy` (Privy retirado en I4)  
- I1: `components/wallet/ThirdwebWallet*`, `lib/wallet/providers/thirdweb.ts`, `lib/wallet/config.test.ts`  
- `lib/auth/session.ts` — JWT `sub` (userId) + `eoa` + role + `authProvider`  
- `prisma` — `User.eoaAddress` **@unique** (single wallet per user)  
- `lib/onboarding-identity.ts` — session wallet must match onboarding body; blocks rebind after `registrationCompleted`  
- Privy tree: `components/wallet/Privy*`, `lib/wallet/providers/privy.ts`, ~40 TS surfaces (grep `privy`)

---

## 1. One-liner

**Human / embed WaaP** remains the primary connect path; **Thirdweb Connect** is the **fallback** when WaaP is unavailable or the user chooses “otra wallet”; **SIWE** is the only server trust boundary. Product identity is **`userId`**, with **multiple EOAs linkadas** por cuenta (estilo siwe-django), sin usar smart wallets in-house como clave de identidad.

---

## 2. Goals / non-goals

### In

- Client: `NEXT_PUBLIC_WALLET_PROVIDER` default **`waap`**; optional **`thirdweb`** fallback adapter behind the same `useWallet()` facade.
- Server: login y APIs siguen validando **firma SIWE** + dominio allowlist (slice 5).
- **Multi-wallet:** tabla de vínculos; una wallet **primaria** en sesión; link/unlink con **step-up SIWE** en la wallet que se añade o quita.
- **Quitar Privy** del bundle, env, scripts operativos y UI de producción (mantener datos históricos en DB hasta migración opcional).
- Sesión y autorización: **`requireSession` resuelve `userId`**; comparaciones sensibles usan **wallet activa de sesión** salvo rutas explícitas “cualquier wallet linkada”.
- Documentar env Thirdweb (`NEXT_PUBLIC_THIRDWEB_CLIENT_ID` o equivalente SDK v5) y feature flag de fallback.

### Out

- Reemplazar SIWE por Thirdweb Auth server-side como fuente única de verdad.
- Smart wallet / ZeroDev como identidad (`NEXT_PUBLIC_ENABLE_ZERODEV` sigue dormant).
- Merge automático de dos cuentas `User` distintas al linkar (conflict = 409 + soporte).
- Login por email sin wallet (fuera de flujos ya existentes).
- Cambiar consentimientos clínicos, founding waitlist, o Stripe en este programa (solo compatibilidad con `userId`).
- Usar IP u otros identificadores de producto para auth.

---

## 3. Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **WaaP first**, Thirdweb **fallback only** | Alineado con pagos/autocustodia actuales; Thirdweb no sustituye WaaP en happy path. |
| D2 | **Retire Privy** en runtime y dependencias npm | Producto no quiere vendor lock-in Privy; usuarios existentes con `privyId` siguen entrando vía **SIWE + wallet linkada** o migración manual. |
| D3 | **`userId` canónico** en JWT `sub`; `eoa` = wallet activa | APIs de producto (Psychat, créditos, enrollments) ya cuelgan de `userId` donde hay sesión completa. |
| D4 | **Multi-wallet** en tabla dedicada; `User.eoaAddress` → **primary EOA** durante transición | Evita romper 200+ referencias de golpe; slices migran lecturas a `userId` + join opcional. |
| D5 | **No rebind** de primary tras `registrationCompleted` sin flujo admin | Mantiene `decideOnboardingIdentity` + amplía con link secundario, no swap silencioso. |
| D6 | `AuthProvider` enum añade **`thirdweb`**; **`privy` deja de escribirse** | Columna `privyId` read-only legacy hasta slice de limpieza schema. |
| D7 | Rollback = checkout tag + revert branch | No “feature flag Privy” permanente. |
| D8 | **Mismo `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` que Lab-Avril-Life** | Un solo proyecto Thirdweb (dashboard compartido Avril ↔ MotusDAO); misma experiencia de connect/fallback; la EOA la controla el usuario, no el client id. |

---

## 4. Target architecture

```text
Browser
  WalletProviderWrapper
    ├─ waap (default) ──► WaaPProviderWrapper / Human embed
    └─ thirdweb (fallback) ──► ThirdwebWalletProviderWrapper
           │
           ▼
  useWallet() → address, chain, connect, disconnect
           │
           ▼
  SIWE (issue nonce → sign → POST /api/auth/verify) → session cookie (JWT)
           │
           ▼
  userId + activeEoa + role + authProvider (client connect path, not trust)
```

**Trust model:** el servidor solo confía en **SIWE verificado** + cookie firmada. `authProvider` en DB describe cómo conectó el cliente la última vez; no sustituye SIWE.

### 4.1 Data model (v1)

Nuevo modelo (nombres ajustables en implementación; contrato locked):

| Model | Fields | Notes |
|-------|--------|-------|
| `LinkedWallet` | `id`, `userId`, `address` (checksum stored lower), `label?`, `isPrimary`, `linkedAt`, `lastUsedAt?` | `@@unique([address])` global — una EOA, un usuario |
| `User` | mantiene `eoaAddress` | **Mirror** de `LinkedWallet` donde `isPrimary=true` hasta slice de deprecación |

**Migración inicial:** para cada `User` existente, insertar fila `LinkedWallet` primary = `eoaAddress`.

**Login:** SIWE con address A → buscar `LinkedWallet` por A → cargar `userId`. Si no existe y registro permitido → crear user + primary link (onboarding existente).

**Link secundario:** usuario autenticado → nonce SIWE para B → verify → insert `LinkedWallet` si B libre.

**Unlink:** requiere sesión + SIWE con la wallet a desvincular (o primary + step-up); no permitir quitar la única wallet.

### 4.2 Session payload (delta)

`SessionPayload` (JWT):

- `sub` — **required** cuando registro completo (hoy a veces null pre-onboarding; mantener reglas actuales hasta slice 4).
- `eoa` — wallet activa para esta sesión (firma reciente).
- `role`, `isPlatformAdmin`, `authProvider`, `lastActiveAt` — sin cambio semántico.

Opcional slice 4: `linkedWalletId` si hace falta auditoría; no obligatorio v1.

---

## 5. API contract (new / changed)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/auth/wallets` | Session | Lista wallets linkadas + primary |
| POST | `/api/auth/wallets/link` | Session | Body: SIWE message + signature (wallet a añadir) |
| POST | `/api/auth/wallets/unlink` | Session | Body: `address` + SIWE step-up |
| POST | `/api/auth/wallets/set-primary` | Session | Cambiar primary **solo si** `!registrationCompleted` **o** admin tooling |
| POST | `/api/auth/verify` | Public | **Extend:** resolver user por `LinkedWallet.address` además de `User.eoaAddress` |

Rutas que hoy comparan `session.eoa` con body (`onboarding`, `faucet`, Ripio, etc.) — **sin cambio en slice 1–2**; slice 4 audita lista y documenta excepciones.

---

## 6. Implementation slices (orden obligatorio)

Cada slice = un PR a `feat/waap-thirdweb-siwe-multilink`; merge a `main` solo con gate verde + QA manual corto.

### Slice I1 — Thirdweb adapter (sin quitar Privy aún) — **SHIPPED**

**Entrega:** `thirdweb` en `getConfiguredWalletProvider()`; wrapper + bridge; `AuthProvider.thirdweb` en Prisma; `env.example` + migración `20261117040000_auth_provider_thirdweb`; tests `lib/wallet/config.test.ts`; dep `thirdweb@^5.121.1`.

**Criterios:**

1. **Given** `NEXT_PUBLIC_WALLET_PROVIDER=waap`, **when** app carga, **then** solo árbol WaaP (comportamiento idéntico a hoy).
2. **Given** `NEXT_PUBLIC_WALLET_PROVIDER=thirdweb` y client id válido, **when** usuario conecta y hace SIWE, **then** sesión igual que WaaP (mismo cookie + verify).
3. **Negative:** **given** thirdweb sin client id, **when** build/prod boot, **then** error claro en dev o fallback documentado (no silent blank).

### Slice I2 — `LinkedWallet` + verify por address

**Entrega:** migración Prisma, backfill, verify/login lookup, `GET /api/auth/wallets`.

**Criterios:**

1. **Given** user legacy con solo `User.eoaAddress`, **when** migración corre, **then** existe `LinkedWallet` primary equivalente.
2. **Given** SIWE con address linkada, **when** verify, **then** `sub` = mismo `userId` aunque `User.eoaAddress` ya no sea la única fuente.
3. **Negative:** **given** address ya linkada a otro user, **when** link POST, **then** 409.

### Slice I3 — Link / unlink UI mínima + step-up

**Entrega:** settings o perfil: listar wallets; añadir con SIWE; quitar secundaria.

**Criterios:**

1. **Given** sesión con user A, **when** link wallet B con SIWE válido, **then** B aparece en lista y login con B entra como A.
2. **Given** una sola wallet, **when** unlink, **then** 400.
3. **Given** `registrationCompleted`, **when** intento `set-primary` sin admin, **then** 403 (regla D5).

### Slice I4 — Retire Privy

**Entrega:** eliminar wrappers Privy, dependencia `@privy-io/*`, env `NEXT_PUBLIC_PRIVY_*`, scripts `sync-privy-id`, admin sync UI; actualizar `auth-provider-agnostic.md` header **SUPERSEDED**.

**Criterios:**

1. **Given** build producción default env, **when** `npm run build`, **then** no importa paquetes Privy.
2. **Given** grep en `app/` + `components/` + `lib/wallet`, **then** cero referencias runtime a Privy (scripts archive opcional en `archive/`).
3. Usuarios con `privyId` en DB **siguen** pudiendo SIWE si su EOA está en `LinkedWallet` / `User.eoaAddress`.

### Slice I5 — Hardening + docs

**Entrega:** actualizar `specs/STATUS.md`, `env.example`, runbook rollback; auditar rutas “session eoa must match” en [safety-slice-4](./safety-slice-4-inbox-platform-keys.md); tests negativos link.

---

## 7. Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_WALLET_PROVIDER` | no (default `waap`) | `waap` \| `thirdweb` — **no `privy` post I4** |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | si provider=thirdweb | SDK Thirdweb v5 — **mismo valor que Lab-Avril-Life** (ver `env.example`; no commitear `THIRDWEB_SECRET_KEY`) |
| `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `SIWE_ALLOWED_DOMAINS` | sí (prod) | Sin cambio |
| `NEXT_PUBLIC_PRIVY_APP_ID` | **remove post I4** | — |

---

## 8. QA gate (program exit)

- [ ] Los 5 slices cumplen criterios y non-goals.
- [ ] `npm run lint && npx tsc --noEmit && npm test && npm run build`
- [ ] `prisma validate` + migración con nota rollback (drop `LinkedWallet` + revert enum solo si no hay datos prod)
- [ ] Manual: WaaP login, Thirdweb login (staging), link segunda wallet, Psychat + onboarding smoke
- [ ] Tag opcional post-merge: `identity-waap-thirdweb-multilink-YYYY-MM-DD`

---

## 9. Handoff checklist (próximo agente)

1. Branch: `feat/waap-thirdweb-siwe-multilink` (I1 merged o en tip; ver `STATUS.md`).
2. `export MOTUS_ACTIVE_SPEC=specs/identity-waap-thirdweb-siwe-multilink.md` y slice **I2** (`LinkedWallet` + verify).
3. Leer anchors: `lib/auth/session.ts`, `app/api/auth/verify/route.ts`, `lib/onboarding-identity.ts`, `prisma/schema.prisma`.
4. Deploy: aplicar migración `20261117040000_auth_provider_thirdweb` antes de escribir `authProvider=thirdweb` en prod.
5. Vercel: copiar `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` desde Lab / `env.example` si se activa fallback `thirdweb`.
6. No tocar founding MKT ni Psychat salvo tests rotos por auth.
7. Tras cada slice: gate completo + actualizar este doc y `STATUS.md`.

---

## 10. Open questions (resolver antes de I3 si aplica)

| ID | Question | Default si no hay respuesta |
|----|----------|------------------------------|
| Q1 | ¿UI link wallets en `/perfil` o onboarding step dedicado? | `/perfil` + link en StepConnect solo lectura |
| Q2 | ¿Máximo wallets por user? | 5 |
| Q3 | ¿Migración automática `privyId` → link sin EOA en DB? | Manual soporte; no auto-merge |

---

*Identity SDD · MotusDAO Hub · 2026-11-17*