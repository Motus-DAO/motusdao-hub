# MKT-EXP · Founding allowlist — Usuarios y PSM

**Status:** **SHIPPED (code M1–M3)** · ops M0 (cupones Stripe live + Resend) pendiente en cada entorno · spec **LOCKED** salvo cambios de cap/legal.
**Surface:** Hub MotusDAO (`NEXT_PUBLIC_APP_URL`)
**Last updated:** 2026-11-17
**Reference (read-only):** `Lab-Avril-Life/docs/marketing-experiments/founding-allowlist-waitlist.md`, `lib/founding-stripe.ts`, `lib/founding-promo-email-template.ts`, `lib/support-mail.ts`

**Related:** [`lib/ai-credit.ts`](../lib/ai-credit.ts) (`AI_CREDIT_PACKS_USD`: 5, 10) · [`app/api/ai/credit/checkout/route.ts`](../app/api/ai/credit/checkout/route.ts) · [`app/api/stripe/checkout-session/route.ts`](../app/api/stripe/checkout-session/route.ts) (Academia) · [`lib/mns-register.ts`](../lib/mns-register.ts) · [`components/onboarding/steps/StepBlockchain.tsx`](../components/onboarding/steps/StepBlockchain.tsx) · [funnel-open-market-tofu.md](./funnel-open-market-tofu.md) (TOFU / no bloquear antes de founding)

---

## 1. One-liner

Dos **listas fundadoras** (persona usuaria y PSM) con **leaderboard público**, tier por posición (**50% → 30% → 10%**), admin con SIWE, códigos Stripe de un solo uso y email vía **Resend** — flujo de registro idéntico a Lab hasta **mint MNS (`.motus`)**; la redención cambia por rol: **crédito Psychat (5/10 USD)** vs **checkout Academia**.

---

## 2. Goals / non-goals

### In

- Selector **Usuario** | **Profesional (PSM)** al entrar al modal.
- **Dos listas independientes:** cap, `nextPosition`, leaderboard y KPIs por rol.
- Mismo flujo de captura que Lab: nombre público, email, wallet, faucet CELO, registro MNS, `POST` waitlist con `mnsLabel` + `mnsTxHash`.
- Tier **bloqueado al signup**; tabla pública sin email.
- Admin: listar, generar promo Stripe, enviar Resend, hard delete + audit.
- Checkout con `allow_promotion_codes: true` en crédito Psychat y Academia.

### Out

- Cambiar precios de lista de cursos o paquetes 5/10 USD (solo descuento vía promo).
- Sustituir onboarding SIWE / consentimientos clínicos existentes.
- Aprobar PSM en marketplace solo por estar en la lista (sigue gate admin de perfil público).
- Bump del crédito diario **0.10 USD** como beneficio founding (opcional futuro; este SDD = **descuento en compra**).
- Email transaccional fuera de founding (soporte) — fuera de este slice salvo reutilizar plumbing Resend.

---

## 3. Discount tiers (locked v1)

Misma banda de posición que Lab para **cada lista**:

| Tier | Discount | Positions (inclusive) |
|------|----------|------------------------|
| **A** | **50%** | 1–10 |
| **B** | **30%** | 11–30 |
| **C** | **10%** | 31–**cap** |

**Cap por lista:** default **100** (`MKT_FOUNDING_CAP_USER`, `MKT_FOUNDING_CAP_PSM`). Tras cap, `POST` → `CLOSED`.

**Redención por rol:**

| Rol | Checkout | Precios de lista (ejemplos) | @ 50% | @ 30% | @ 10% |
|-----|----------|-----------------------------|-------|-------|-------|
| **Usuario** | `/api/ai/credit/checkout` | Paquetes **5** y **10 USD** | 2.50 / 5.00 | 3.50 / 7.00 | 4.50 / 9.00 |
| **PSM** | `/api/stripe/checkout-session` | Cursos Academia publicados (one-time o mensual) | % sobre `amount_total` | idem | idem |

**Position policy on delete:** hard delete saca la fila del leaderboard pero **no renumera** (anti-gaming), igual que Lab.

---

## 4. Nomenclatura de vales (Stripe promotion codes)

Patrón Lab (referencia):

```text
AVL-{position}-{SLUG}
```

- `position`: entero de la lista (1…cap), sin padding.
- `SLUG`: derivado del **nombre público** (display o `{label}.motus`): mayúsculas, solo `A–Z` y `0–9`, máximo **12** caracteres; si queda vacío → `USER` (Lab) / ver fallback por rol abajo.

### Códigos Motus (human-facing, pegar en Stripe Checkout)

| Rol | Prefijo | Formato | Ejemplo |
|-----|---------|---------|---------|
| **Usuario** | `MTU` | **`MTU-{position}-{SLUG}`** | `MTU-7-ANALUCIA` |
| **PSM** | `MTP` | **`MTP-{position}-{SLUG}`** | `MTP-3-DRGARCIA` |

Reglas (igual que `slugCodePart` en Lab):

1. Stripe admite códigos alfanuméricos; evitar guiones extra más allá de los dos separadores fijos.
2. `max_redemptions: 1` por código.
3. `expires_at` opcional vía `FOUNDING_CODE_EXPIRES_AT_UNIX` (misma semántica que Lab).
4. Un email **activo a la vez por lista**; tras hard delete puede volver al **final** de esa lista.

### Cupones plantilla (Stripe Coupon objects, no códigos por fila)

Se crean **seis** cupones `duration: once` (o env override), con metadata distinta por rol:

| Coupon (nombre Dashboard / API) | `percent_off` | Metadata `foundingRole` | Metadata `tier` |
|----------------------------------|---------------|-------------------------|-----------------|
| Motus Founding **Usuario** Tier A | 50 | `user` | `A` |
| Motus Founding **Usuario** Tier B | 30 | `user` | `B` |
| Motus Founding **Usuario** Tier C | 10 | `user` | `C` |
| Motus Founding **PSM** Tier A | 50 | `psm` | `A` |
| Motus Founding **PSM** Tier B | 30 | `psm` | `B` |
| Motus Founding **PSM** Tier C | 10 | `psm` | `C` |

**Metadata en cada Promotion Code** (obligatoria):

```json
{
  "foundingAllowlist": "true",
  "foundingRole": "user",
  "tier": "A",
  "position": "7"
}
```

(`foundingRole: "psm"` en lista profesional.)

**Persistencia de IDs** (auto-create primera vez, como Lab): `data/founding-stripe-coupons.json` con scope `motus.hub.founding_stripe_coupons` y mapas `user: { A, B, C }`, `psm: { A, B, C }`.

### Env overrides (opcional)

| Variable | Rol | Tier |
|----------|-----|------|
| `STRIPE_FOUNDING_COUPON_USER_50` | user | A |
| `STRIPE_FOUNDING_COUPON_USER_30` | user | B |
| `STRIPE_FOUNDING_COUPON_USER_10` | user | C |
| `STRIPE_FOUNDING_COUPON_PSM_50` | psm | A |
| `STRIPE_FOUNDING_COUPON_PSM_30` | psm | B |
| `STRIPE_FOUNDING_COUPON_PSM_10` | psm | C |

---

## 5. User experience

### 5.1 Entry

- **Modal founding** (paridad Lab — `components/founding/founding-waitlist-modal.tsx`): teaser → **elegir rol** → register → wallet → `.motus` → done / tabla. Host: `FoundingWaitlistModalHost` en `AppShell`; `/founding` abre el mismo modal. Auto-prompt home: `NEXT_PUBLIC_FOUNDING_WAITLIST_PROMPT=true`.
- Copy ES primero; EN opcional (`locale` en fila).
- Campos: display name, email (privado), opcionales intake (solo usuarios: mood/use case; PSM: especialidad o harness si se desea v1).

### 5.2 Wallet + MNS (igual Lab, superficie Hub)

1. Conectar WaaP.
2. Faucet CELO (proof firmado; ledger un drip por wallet).
3. Registrar nombre **`{label}.motus`** on-chain.
4. `POST /api/founding/waitlist` con rol en body; **requiere** `mnsLabel` + `mnsTxHash`.

### 5.3 After signup

- Vista **leaderboard** de la lista elegida (rank, nombre público, tier %, sin email).
- Nombre público: `{label}.motus` si hay mint; fallback como `lib/founding-identity` en Lab.

### 5.4 Redención

1. Ops genera código (`MTU-…` o `MTP-…`) o botón admin Stripe API.
2. Resend envía plantilla (§9).
3. Usuario con sesión Hub:
   - **MTU:** Psychat → comprar **5 o 10 USD** → pegar código.
   - **MTP:** Academia → curso de pago → pegar código.
4. Marcar `redeemed` manual o vía match webhook Stripe + metadata `foundingAllowlist`.

**Deep links** (suprimir auto-modal si presentes):

| Rol | Query | Destino |
|-----|-------|---------|
| Usuario | `?from=founding-code` | `/psychat` |
| PSM | `?from=founding-code` | `/academia` (o curso genesis/praxis según campaña) |

---

## 6. Data model

**v1 recomendado:** JSONL en volumen persistente (paridad Lab) **o** tabla Prisma `FoundingWaitlistEntry` con índice `(role, email)` — implementación elige; comportamiento idéntico.

**Scope por fila:**

| Rol | `scope` |
|-----|---------|
| Usuario | `motus.hub.founding_waitlist_user` |
| PSM | `motus.hub.founding_waitlist_psm` |

**Record:**

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | `FOUND-U-YYYYMMDD-HEX` \| `FOUND-P-YYYYMMDD-HEX` |
| `role` | `user` \| `psm` | |
| `createdAt` | ISO | |
| `position` | number | Inmutable |
| `tier` | `A` \| `B` \| `C` | |
| `discountPercent` | 10 \| 30 \| 50 | Denormalized |
| `displayName` | string | Público |
| `email` | string | Privado, lowercased |
| `wallet` | string? | Checksummed |
| `mnsLabel` | string? | Sin TLD |
| `mnsTxHash` | string? | |
| `status` | enum | `registered` · `code_sent` · `redeemed` |
| `stripePromotionCode` | string? | `MTU-…` o `MTP-…` |
| `stripePromotionCodeId` | string? | |
| `codeSentAt` | ISO? | |
| `clientIp` | string | |
| `locale` | `en` \| `es` | |

**Meta:** `founding-waitlist-meta-user.json` y `founding-waitlist-meta-psm.json` con `{ "nextPosition": n }` (o filas meta en DB).

**Audit delete:** scope `motus.hub.founding_waitlist_audit`; guardar `emailHash`, `role`, `adminWallet`, `position`, `deletedAt`.

**Faucet ledger:** reutilizar patrón Hub existente + ledger founding si hace falta (`FOUNDING_FAUCET_CLAIMS_PATH`), un drip/wallet.

---

## 7. APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/founding/waitlist` | Public + rate limit | Body incluye `role`; signup atómico por lista |
| `GET` | `/api/founding/waitlist?role=user\|psm` | Public | Proyección pública paginada |
| `GET` | `/api/admin/founding/waitlist?role=…` | Admin SIWE | Lista completa + KPIs por rol |
| `POST` | `/api/admin/founding/waitlist/:id/stripe-code` | Admin | Crea `MTU-…` o `MTP-…` |
| `POST` | `/api/admin/founding/waitlist/:id/send-code` | Admin | Resend + `code_sent` |
| `DELETE` | `/api/admin/founding/waitlist/:id` | Admin | Hard delete + audit |

**Admin auth:** alinear con Hub admin/SIWE existente (no copiar cookie Lab salvo slice dedicado); allowlist wallets en env `HUB_ADMIN_WALLETS` o equivalente ya usado en admin.

---

## 8. Stripe (checkout)

1. Habilitar **`allow_promotion_codes: true`** en:
   - `app/api/ai/credit/checkout/route.ts`
   - `app/api/stripe/checkout-session/route.ts`
2. Generación API (espejo Lab):

```ts
// role === 'user' → resolveFoundingCouponId('user', tier)
// code = `MTU-${position}-${slug(displayName)}`
// role === 'psm'  → code = `MTP-${position}-${slug(displayName)}`
```

3. **No** auto-aplicar founding codes server-side.
4. Delete row en DB **no** desactiva código en Stripe (admin desactiva manual o API después).

---

## 9. Resend (mismo patrón Lab)

Plumbing nuevo en Hub (hoy sin Resend en repo): copiar contrato de `Lab-Avril-Life/lib/support-mail.ts`.

### Env (ops — humano provee keys)

| Variable | Required | Notes |
|----------|----------|--------|
| `SUPPORT_MAIL_ENABLED` | sí (`1` / `true`) | Default **off** en dev |
| `RESEND_API_KEY` | sí para envío real | `re_…` |
| `SUPPORT_MAIL_FROM` | recomendado | ej. `MotusDAO <hola@motusdao.org>` (dominio verificado en Resend) |
| `SUPPORT_OPS_NOTIFY_EMAIL` | no | Ops copy en tickets futuros |
| `FOUNDING_CODE_EXPIRES_AT_UNIX` | no | propagar a copy del pie de email si se usa |

**`supportMailPlumbingReady()`** = `SUPPORT_MAIL_ENABLED` + `RESEND_API_KEY`.

### Envío founding

- Función: `sendFoundingPromoCodeEmail({ role, email, displayName, position, discountPercent, code, locale })`.
- Transport: `POST https://api.resend.com/emails`, `Authorization: Bearer`, JSON `{ from, to, subject, text, html }`.
- Logs JSON: `scope: motus.hub.founding_mail_sent` \| `founding_mail_error`; `kind: founding_code_user` | `founding_code_psm`; `ticketId: record.id`.

### Asuntos (espejo Lab)

| Rol | ES | EN |
|-----|----|----|
| Usuario | `[Motus] Tu código Founding Allowlist — Usuario (#{position})` | `[Motus] Your Founding Allowlist code — User (#{position})` |
| PSM | `[Motus] Tu código Founding Allowlist — Profesional (#{position})` | `[Motus] Your Founding Allowlist code — Professional (#{position})` |

### Plantilla HTML/text

- Misma estructura que `buildFoundingPromoEmailContent` (Lab): dark card, gradient strip, monospace code block, CTA button.
- Brand tokens Hub (púrpura Motus / glass), no cyan Avril.
- **CTA URL:**
  - Usuario: `{SITE_URL}/psychat?from=founding-code`
  - PSM: `{SITE_URL}/academia?from=founding-code`
- Copy cuerpo:
  - Usuario: % off en compra de crédito Psychat **5 o 10 USD**; pegar código en Checkout.
  - PSM: % off en inscripción Academia (cursos de pago); pegar código en Checkout.
- Footer legal: el descuento no sustituye consentimientos ni aprobación de perfil PSM; vigencia según campaña.

**v1 manual:** admin puede “mark code sent” sin email si ops envía código por otro canal (igual Lab).

---

## 10. Admin UI

Sección **Founding** (o dos tabs **Usuarios** / **PSM**):

| Action | Notes |
|--------|--------|
| Tabla | position, tier, public name, email, status, code |
| Generate | `MTU-…` / `MTP-…` vía Stripe API |
| Send email | Requiere Resend listo |
| Copy code | Clipboard |
| Hard delete | Confirm + audit |
| KPIs | signups, by tier, codes sent, redeemed, cap remaining **per role** |

---

## 11. Security & abuse

- Rate limits en `POST`/`GET` founding (familia `api-security` Hub).
- Email normalizado; límites en `displayName` / campos opcionales.
- Faucet: proof + 1 claim/wallet.
- MNS: disponibilidad on-chain es verdad; bind wallet en fila.
- Lista pública: nunca email.

---

## 12. Delivery phases

| Phase | ID | Deliverable |
|-------|-----|-------------|
| **M0** | MKT-MOTUS-0 | Este SDD + cupones Stripe test/live + env Resend |
| **M1** | MKT-MOTUS-1 | Store dual, APIs públicas, modal + selector rol + MNS gate |
| **M2** | MKT-MOTUS-2 | Admin founding + delete/audit + `lib/support-mail` + plantilla |
| **M3** | MKT-MOTUS-3 | Stripe promo API + `allow_promotion_codes` en checkouts |
| **M4** | MKT-MOTUS-4 | KPIs admin, eventos analytics opcionales, copy legal en `/privacy` |

**DoD M1–M3:** founder registra en staging en ambas listas, ve rank, envía un `MTU-*` y un `MTP-*`, completa checkout con descuento en Psychat 5 USD y un curso Academia de pago.

---

## 13. Acceptance criteria (Given / When / Then)

1. **Given** cap no alcanzado, **when** `POST` con `role=user` y MNS válido, **then** fila en lista usuario con tier correcto y código futuro `MTU-{position}-*`.
2. **Given** cap no alcanzado, **when** `POST` con `role=psm`, **then** fila en lista PSM y patrón `MTP-{position}-*`.
3. **Given** leaderboard público, **when** `GET`, **then** sin emails y nombres `*.motus` si aplica.
4. **Given** admin autorizado, **when** genera + envía código usuario, **then** Resend entrega (o 503 si mail off) y `status=code_sent`.
5. **Given** checkout Psychat 10 USD y código tier A usuario, **when** usuario paga en Stripe, **then** `amount_total` refleja 50% off (5 USD) y metadata founding en promo.
6. **Given** hard delete, **when** mismo email re-registra, **then** nueva posición al final; posiciones existentes sin cambio.
7. **Negative:** **given** `role` inválido o sin MNS, **when** `POST`, **then** 400 y sin fila.

---

## 14. QA gate

- [ ] AC 1–7 cubiertos por tests o checks manuales documentados.
- [ ] `npm run lint && npx tsc --noEmit && npm test && npm run build`
- [ ] Sin secretos en repo; `env.example` documenta vars §9 y §3 env overrides.
- [ ] No mezclar founding promos con `STRIPE_INTERNAL_PROMOTION_CODE` u otros funnels internos.

---

## 15. Legal / copy (one-liners)

- Descuento atado a **posición al signup**; caducidad si se indica en email.
- Lista fundadora **no** garantiza matching clínico ni publicación de perfil PSM.
- Email solo para entrega de código; wallet/MNS públicos en tabla según política de privacidad Hub.

---

## Change log

| Date | Change |
|------|--------|
| 2026-11-17 | Initial SDD — dual list Usuario/PSM, códigos `MTU-*` / `MTP-*`, Resend espejo Lab, redención Psychat 5/10 + Academia |
| 2026-11-17 | Implementación Hub — Prisma waitlist, APIs, `/founding`, admin `/admin/founding`, promo Stripe, `allow_promotion_codes` en checkouts |