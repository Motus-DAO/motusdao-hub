# Estado del Hub — dashboard

> **Único doc de estado.** El detalle vive en los specs; la taxonomía y las fases viven en
> [platform-harmonize.md](./platform-harmonize.md). No dupliques tablas de estado en otros docs.
>
> **Última verificación:** 2026-11-07 · `main` + dashboard embebido de Connect · Owner: product + eng.
>
> Planes: [SDD-safety-plan](../docs/specs/SDD-safety-plan.md) ·
> [SDD-chat-data](../docs/specs/SDD-chat-data.md) ·
> [chat-data-roadmap](./chat-data-roadmap.md)

## Cómo leer este doc

| Estado | Significado |
|--------|-------------|
| **Shipped** | En `main`, con spec y evidencia; el gate del repo pasa. |
| **In flight** | Código parcial o pendiente de verificación en producción. |
| **Next** | Siguiente trabajo recomendado; no está comprometido. |
| **Gap** | Deuda conocida y aceptada por ahora. |

Un slice pasa a **Shipped** solo con `npm run lint`, `npx tsc --noEmit` y `npm test` en verde.
Si toca la app, además `npm run build`. Si toca el schema, migración + nota de rollback.

---

## 1. Resumen por línea

| Línea | Estado | Evidencia |
|-------|--------|-----------|
| Seguridad clínica (safety 1–7) | **Shipped** | [specs](./safety-slice-1-therapy-rooms.md) · Oct 22–27 |
| Portabilidad de datos (chat-data 1–5) | **Shipped** (fase 1 del enclave) | [roadmap](./chat-data-roadmap.md) · Oct 27–28 |
| Academia + Stripe | **Shipped** / cobrando | [admin](./academy-admin-courses.md) · `862e2b6` |
| Pagos (terapia + P2P) | **Stripe Connect dashboard + CLABE/P2P live**; Ripio mock; Textile wired | [README §Pagos](../README.md#payments-and-self-custody) · [CLABE](./therapy-payments-clabe-connect.md) · [Connect v2](./stripe-connect-therapy-v2.md) |
| Psychat PSM (supervisor) | **In flight** | [lock-in](./psychat-psm-supervisor-lockin.md) · `4f04131` |
| Psychat usuario (exploración) | **Parcial** (regresión de routing) | [spec](./psychat-usuario-modo-exploracion.md) · slice 3 |
| Video / Jitsi | **Shipped** (servidor privado) | [runbook](../docs/runbooks/VERCEL_VIDEOCHAT_ENV.md) |
| Compliance beta | **Shipped** | [compliance](../docs/compliance/README.md) · `fde8017` |
| Seguridad de dependencias | **Parcheado Oct-2026**; deuda transitiva | [runbook](../docs/runbooks/security-patching.md) |
| On-chain (MNS, faucet, NFT) | **Parcial** | README §On-chain |

---

## 2. Shipped

### 2.1 Seguridad clínica — slices 1–7

| # | Entrega | Commit |
|---|---------|--------|
| 1 | Terapia solo en Jitsi privado; se elimina el fallback a `meet.jit.si` | `9e99066` |
| 2 | Psychat con sesión + consentimiento IA; system prompt del servidor | `db54253` |
| 3 | Onboarding escribe solo para la wallet firmada; consentimientos afirmativos | `92789f4` |
| 4 | Inbox y llaves de plataforma (faucet, Pimlico, Ripio) con sesión | `25b936f` |
| 5 | Admin revalidado contra DB, sesión clínica corta, auditoría que falla cerrada | `1e7ae55` |
| 6 | Aviso de privacidad, términos, cookies, subprocesadores (beta) | `fde8017` |
| 7 | Bitácora cifrada en cliente (`motus-safe-notes`, AES-GCM) | `f7f2615` |

Plan: [SDD-safety-plan](../docs/specs/SDD-safety-plan.md). El §4 de ese doc es un **snapshot
histórico** del 21-oct-2026, no el estado actual.

### 2.2 Portabilidad — chat-data 1–5

| # | Entrega | Commit |
|---|---------|--------|
| 1 | Export de bitácora + recuperación | `b0f0b2e` (`99452c1`) |
| 2 | Archivo cifrado de Psychat + export/recuperación | `a5aecb2` (+ `2926dbc`) |
| 3 | Resumen consentido al PSM en FHIR `DocumentReference` | `7b5577a` |
| 4 | Copia legible para entrenamiento + consentimiento + compensación | `b785a48` |
| 5 | Proxy local de RootRouter + bridge + UX de memoria | `06b9523` |

Fases 2–3 del enclave: proveedor **Phala LOCKED** ([decisión](../docs/architecture/psychat-enclave-phala-decision.md)),
attestation todavía mock. No es un shipped de producto.

### 2.3 Academia

Catálogo público, player, progreso, edición admin y uploads están implementados. Desde el
28-oct los cursos pagados usan Stripe Checkout (`862e2b6`). Los headers de los specs
`academy-admin-*` siguen en **DRAFT** aunque el flujo existe; es deuda de documentación, no de código.

### 2.4 Pagos: terapia, P2P y rampas

**Terapia:** la CLABE/SPEI está en `main` (`3e6a1d4`): el profesional la captura en `/perfil`, el
paciente la ve solo con cita activa, y cada aviso es una fila en `session_transfer_events`. Stripe
Connect corre sobre **Accounts v2** en `MotusDAO-Connect` (`acct_1TnbVgBffEqB2M2K`), rama
`feat/stripe-connect-v2`: onboarding hosted, dashboard `none`, fees y pérdidas de Stripe, 10% de
comisión y solo México. El profesional gestiona su cuenta en `/cobros` con **componentes
embebidos** (`AccountSession`): avisos, cuenta/banco, pagos, depósitos, saldos y documentos, sin
entrar al Dashboard de Stripe. **En producción desde el 2026-11-07**: los seis Site links están
guardados y el AccountSession live responde. La cuenta del primer PSM
(`acct_1UZ3khBQoDcLVQeX`) sigue en verificación (`charges=false`, `payouts=false`), así que
falta completar su onboarding y el primer cobro real. Detalle:
[spec](stripe-connect-therapy-v2.md).

**P2P (`/pagos`):** el usuario envía y recibe CELO, stablecoins y wFIAT desde su wallet
**autocustodiada en WaaP (Human.tech)**; hay QR de recepción, escáner de QR, resolución de
nombres `.motus` y link al explorador. Motus no custodia los fondos ni las llaves.

**Rampas:** Ripio está integrado de punta a punta (widget auth + URL hospedada) pero corre en
**modo mock** hasta que existan `RIPIO_CLIENT_ID` / `RIPIO_CLIENT_SECRET`; **no está activo**.
Textile FX v2 está cableado para swaps `wARS`/`wBRL` ↔ `USDT` (RFQ público, sin llave de Motus).
Los handlers legacy de Transak / Mt Pelerin / Privy siguen en el código pero no se muestran en el
grid actual. Detalle: [README §Pagos](../README.md#payments-and-self-custody).

### 2.5 Psychat

- **PSM:** conversación en prosa por defecto y “Reporte estructurado” por botón; modelo Qwen
  supervisor TEE en Venice. Código en `4f04131`.
- **Usuario:** modo exploración con JSON de cinco campos y handoff humano (`d49d09f`).
- **Privacidad:** toggle TEE/E2EE, archivo cifrado y memoria RootRouter local.

### 2.6 Infra y on-chain

- Jitsi privado en `jitsi.motusdao.org`; el Hub no cae a `meet.jit.si`.
- MNS, faucet y NFT de perfil clínico en Celo; integración **parcial**.
- Supabase Postgres + Storage + pgvector; [data-layer](../docs/architecture/data-layer.md).

### 2.7 Atribución Celo (ERC-8021)

Toda transacción del Hub en Celo mainnet lleva el código `celo_0ee3486819c5` (emitido en
Loops House): `lib/attribution.ts` + `dataSuffix` de viem en el wallet client de WaaP, y el
path manual de MNS. Verificado on-chain con `verifyTx` en `0x9d0ad535…74a22` (1 wMXN).
Detalle: [spec](./celo-attribution.md).

---

## 3. In flight

| Trabajo | Qué falta | Riesgo |
|---------|-----------|--------|
| **Psychat PSM slice 1** | Validar en producción que el deploy incluye `4f04131`; actualizar el header del spec | El spec dice READY; el código ya está en `main` |
| **Psychat PSM slice 2** | Bloquear el proxy RootRouter para rol PSM; verificar banner de error 502 | El botón de reporte ya existe, pero el proxy sigue disponible para PSM |
| **Psychat usuario slice 3** | Restaurar exploración **solo con trigger**; hoy cada turno devuelve JSON | Contradice el spec de usuario y empeora la conversación |
| **Stripe Connect terapia v2** | Verificación del primer PSM, E2E test mode y primer cobro live | Dashboard embebido + Site links + AccountSession ya en prod (2026-11-07); la cuenta sigue sin `charges`/`payouts` |
| **Enclave Phala fases 2–3** | Worker, medición publicada, attestation real, precios | `PSYCHAT_ENCLAVE_ATTESTATION_MOCK_OK` no es un control |
| **Ripio rampa pública** | Confirmar el payout del off-ramp (Ripio valida la CLABE con un micro-depósito) y decidir el off-ramp automático | Compra y venta ya probadas en prod desde iPhone; el B2B sigue bloqueado por KYB |
| **Historial de tx (capa 1)** | Verificar `/pagos/historial` en prod | Lee Blockscout; la persistencia (`OnchainTransaction`) queda como capa 2 |
| **Finance hub (IA + actividad)** | Verificar menú, hub y `/finanzas/actividad` en prod | Read model (Blockscout + terapia + Academia); el ledger persistido es fase 3 |
| **Comisiones SPEI + pago simbólico** | Implementar slices 1–5 del [spec](./spei-commissions.md) | Diseño locked; todavía no hay código |
| **Escrow terapia** | Cron del VPS + pulir UX | **E2E en mainnet**: depósito, settle y release taggeados; escrow `0xFd9F…`, agente ERC-8004 `10053` |

---

## 4. Next (orden recomendado)

1. **Cerrar Psychat PSM slice 2 + slice 3.** Son cambios chicos y ya hay tests en
   `lib/psychat-prompt.test.ts`; devuelven el contrato que describen los specs.
2. **Verificar el deploy de este refresh en Vercel.** Antes de estos fixes, `main` no pasaba
   `tsc`/`build`; confirmar que el PSM fix y la bitácora cifrada ya están en producción.
3. **Revisar los headers de Academia** y moverlos a IMPLEMENTED/SHIPPED con la fecha del commit,
   para que el índice no diga DRAFT sobre flujo en producción.
4. **Decidir `/supervision` y `/mis-usuarios`:** implementarlos con datos reales o quitarlos del
   nav PSM. Hoy son mock con datos de 2024.
5. **Política de migraciones:** `db:deploy` usa `prisma db push`; no hay paso `migrate deploy` en
   el deploy. Decidir y documentar antes del próximo cambio de schema.
6. **Ripio:** activar con credenciales partner o esconder el proveedor con
   `NEXT_PUBLIC_RIPIO_RAMPS_ENABLED=false`. No dejar un botón de on/off-ramp en mock sin aviso.

---

## 5. Gaps y riesgos conocidos

| Gap | Impacto | Nota |
|-----|---------|------|
| `/supervision` y `/mis-usuarios` son mock | Confunden “Supervisión” con Psychat supervisor | Están en el nav PSM (`lib/store.ts`) |
| Attestation de enclave mock | No se puede prometer TEE de contexto | Fase 2–3 |
| `db:deploy` = `db push` | Sin historial de migraciones en deploy | `prisma/migrations` existe |
| Stripe Connect en rama local | Bus factor y drift con `main` | Documentado en el spec |
| Sin e2e | El gate cubre unidades, no flujos completos | `npm test` es node:test |
| Specs de Academia en DRAFT | El índice subestima lo shipped | Solo documentación |
| 5 CVEs críticos transitivos | `form-data`, `request`, `tar`, `proxy-addr`, `protobufjs` | Sin ruta de runtime hoy; ver [runbook](../docs/runbooks/security-patching.md) |
| Ripio / Transak / Mt Pelerin no activos | No hay on/off-ramp fiat real | Ripio en mock; legacy fuera del grid |

---

## 6. Gate de calidad (última corrida)

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | ✅ 0 errores, 22 warnings |
| `npx tsc --noEmit` | ✅ pasa |
| `npm test` | ✅ 48 suites, 144 tests |
| `npx prisma validate` | ✅ schema válido |
| `npm run build` | ✅ pasa |

Última corrida completa: **2026-11-07** (incluye `lib/attribution.test.ts`).

El build fallaba por dos motivos además de los tipos: `/sitemap.xml` y las páginas
`/psicoterapia/pais/*` y `/psicoterapia/especialidades/*` consultaban Postgres durante el
prerender. Ahora el sitemap degrada a rutas estáticas y las listas se renderizan on-demand.

---

## 7. Cómo mantener este doc

1. Al cerrar un slice: mueve su fila de **In flight** a **Shipped** y anota el commit.
2. Al abrir trabajo nuevo: agrégalo a **In flight** con el spec que lo gobierna.
3. No copies esta tabla en `platform-harmonize.md`, en los SDD ni en los README: enlaza aquí.
4. Actualiza **Última verificación** y la tabla del §6 cuando corras el gate.
5. Si un snapshot histórico empieza a leerse como estado actual, márcalo como histórico o
   bórralo; no lo dejes ambiguo.

---

## 8. Registro de este refresh (2026-11-06)

Se trabajó en slices pequeños, un commit por slice. **No se hizo push**: los commits quedaron
locales en `main` para que el equipo los revise.

| Commit | Slice | Qué cambió |
|--------|-------|------------|
| `153f162` | Build / tipos | `PsychatRagSource` en el payload; helper para `NODE_ENV` en el test SIWE |
| `706fa6f` | Tests / CI | `scripts/run-tests.mjs` descubre 33 archivos; CI corre `npm test` |
| `44c1368` | Build / prerender | sitemap resiliente; listings de psicoterapia on-demand |
| `95d25fc` | Estado | `specs/STATUS.md`; `platform-harmonize` deja de duplicar status |
| `aeaab19` | Snapshots | SDD-safety §4 histórico; headers de Psychat y compliance corregidos |
| `cf307b9` | Docs núcleo | AGENTS, README, specs/README, docs/README, HANDOFF, regla Cursor |
| este commit | Cierre | Registra este log y los resultados del gate |

Gate final (2026-11-06): lint 0 errores / 22 warnings · `tsc` verde · 33 archivos y 123 tests ·
`prisma validate` verde · `npm run build` verde.

Rollback: cada commit es independiente; `git revert <sha>` revierte un slice sin tocar los demás.
El tag `harmonize-baseline-2026-07-01` sigue siendo el baseline histórico.

### Addendum — pagos (2026-11-06)

Se documentaron `/pagos`, el QR de envío/recepción, la autocustodia WaaP y el estado real de las
rampas en `README.md`, `env.example` y este dashboard: Ripio está integrado pero en **mock** (no
activo), Textile FX está **cableado** para `wARS`/`wBRL`, y Transak/Mt Pelerin/Privy quedaron como
handlers legacy fuera del grid. Commit: este commit. No cambia el gate.

### Addendum — seguridad (2026-11-06)

Se aplicaron los avisos de octubre 2026: Next **15.5.29** (+ `sharp` 0.35.5), React **19.2.9**,
PostHog **1.447.3** con DOMPurify 3.4.17, PostCSS 8.5.32, y Node **22.23.4+** en CI/engines.
No hay PHP en este repo. Quedan 5 CVEs críticos transitivos sin ruta de runtime; detalle y
rollback en [docs/runbooks/security-patching.md](../docs/runbooks/security-patching.md).

### Addendum — atribución Celo (2026-11-07)

Se añadió el sufijo ERC-8021 a las transacciones de Celo mainnet: `lib/attribution.ts`
(código validado, sufijo cacheado y helper para calldata manual), `lib/payments.ts`
(`dataSuffix` de viem en el wallet client de WaaP) y `lib/mns-register.ts` (path que arma
`eth_sendTransaction` a mano). Verificación: `npm run verify:attribution -- <txHash> [code]`.
El flujo Ripio → WaaP se probó antes del cambio (10 wMXN recibidos); falta la tx posterior.
Detalle y rollback: [celo-attribution.md](./celo-attribution.md).

---

*Estado del Hub · actualizado 2026-11-07 · MotusDAO*
