# Estado del Hub — dashboard

> **Único doc de estado.** El detalle vive en los specs; la taxonomía y las fases viven en
> [platform-harmonize.md](./platform-harmonize.md). No dupliques tablas de estado en otros docs.
>
> **Última verificación:** 2026-11-06 · `main` + refresh de documentación · Owner: product + eng.
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
| Pagos de terapia | **CLABE shipped**; Connect parked | [spec](./therapy-payments-clabe-connect.md) · `3e6a1d4` |
| Psychat PSM (supervisor) | **In flight** | [lock-in](./psychat-psm-supervisor-lockin.md) · `4f04131` |
| Psychat usuario (exploración) | **Parcial** (regresión de routing) | [spec](./psychat-usuario-modo-exploracion.md) · slice 3 |
| Video / Jitsi | **Shipped** (servidor privado) | [runbook](../docs/runbooks/VERCEL_VIDEOCHAT_ENV.md) |
| Compliance beta | **Shipped** | [compliance](../docs/compliance/README.md) · `fde8017` |
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

### 2.4 Pagos de terapia

La CLABE/SPEI está en `main` (`3e6a1d4`): el profesional la captura en `/perfil`, el paciente la
ve solo con cita activa, y cada aviso es una fila en `session_transfer_events`. Stripe Connect
está **estacionado** en la rama local `feat/stripe-connect-therapy` (`30af159`), fuera de GitHub.

### 2.5 Psychat

- **PSM:** conversación en prosa por defecto y “Reporte estructurado” por botón; modelo Qwen
  supervisor TEE en Venice. Código en `4f04131`.
- **Usuario:** modo exploración con JSON de cinco campos y handoff humano (`d49d09f`).
- **Privacidad:** toggle TEE/E2EE, archivo cifrado y memoria RootRouter local.

### 2.6 Infra y on-chain

- Jitsi privado en `jitsi.motusdao.org`; el Hub no cae a `meet.jit.si`.
- MNS, faucet y NFT de perfil clínico en Celo; integración **parcial**.
- Supabase Postgres + Storage + pgvector; [data-layer](../docs/architecture/data-layer.md).

---

## 3. In flight

| Trabajo | Qué falta | Riesgo |
|---------|-----------|--------|
| **Psychat PSM slice 1** | Validar en producción que el deploy incluye `4f04131`; actualizar el header del spec | El spec dice READY; el código ya está en `main` |
| **Psychat PSM slice 2** | Bloquear el proxy RootRouter para rol PSM; verificar banner de error 502 | El botón de reporte ya existe, pero el proxy sigue disponible para PSM |
| **Psychat usuario slice 3** | Restaurar exploración **solo con trigger**; hoy cada turno devuelve JSON | Contradice el spec de usuario y empeora la conversación |
| **Stripe Connect terapia** | Cuenta nueva de Stripe + RFC, rebase y separar llaves | Rama local-only (`30af159`); no fusionar a ciegas |
| **Enclave Phala fases 2–3** | Worker, medición publicada, attestation real, precios | `PSYCHAT_ENCLAVE_ATTESTATION_MOCK_OK` no es un control |

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

---

## 6. Gate de calidad (última corrida)

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | ✅ 0 errores, 22 warnings |
| `npx tsc --noEmit` | ✅ pasa |
| `npm test` | ✅ 33 archivos, 123 tests |
| `npx prisma validate` | ✅ schema válido |
| `npm run build` | ✅ pasa (tras hacer el sitemap y las listas independientes de DB) |

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

*Estado del Hub · actualizado 2026-11-06 · MotusDAO*
