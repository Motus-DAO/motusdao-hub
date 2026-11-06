# Psychat PSM — Supervisor lock-in (SDD índice)

> Status: **LOCK for implementation** · Owner: Hub eng · **3 slices máximo**
>
> **Progress (2026-11-06):** slice 1 code is in `main` (`4f04131`); slices 2–3 open.
> See [STATUS.md](./STATUS.md).
>
> Objetivo: dejar de mezclar parches (Qwen, routing F, Motty fallback, proxy) y **shippear** un supervisor estable antes del slice de **usuario** digital.

---

## Problema actual

- Varios comportamientos conviven: prod **F** (JSON cada turno + DeepSeek), working tree **E-like** (chat + botón reporte + Qwen), capturas buenas = reporte estructurado cuando el parse funciona.
- Sin spec activo, cada sesión de agente reintroduce scope (prompts nuevos, fallbacks clínicos, archive, proxy).
- **Usuario** depende de la misma ruta `/api/chat`; si PSM no está acotado, se contamina exploración.

---

## Decisiones — LOCKED (resolver antes de código)

1. **PSM default = conversación en prosa**; **cinco secciones solo con botón** `requestStructuredReport` (producto oct-2026).
2. **Strings clínicos** = canónico F/E en repo; no bloques `RECONSTRUCTION-worktree-*` ni fallbacks que simulen supervisión.
3. **Venice + PSM** → siempre Qwen supervisor TEE para chat y reporte (`docs/architecture/psychat-supervisor-product.md`).
4. **Nunca** mostrar `SHORT_INPUT_FALLBACK` al rol PSM; error HTTP 502 explícito.
5. **PSM productivo** no usa RootRouter proxy en UI (Motty upstream ≠ dispositivo).
6. **Usuario** queda fuera de estos slices salvo slice 3 (paridad routing E); ver spec existente exploración.

---

## Slices (orden obligatorio)

| # | Spec | Entrega visible | Tamaño |
|---|------|-----------------|--------|
| **1** | [`psychat-psm-slice-1-venice-routing.md`](./psychat-psm-slice-1-venice-routing.md) | PSM chat rápido + reporte por botón; sin MotusDAO fallback | ≤1 día |
| **2** | [`psychat-psm-slice-2-ui-truth.md`](./psychat-psm-slice-2-ui-truth.md) | UI alinea modos; proxy off PSM; errores legibles | ≤½ día |
| **3** | [`psychat-psm-slice-3-usuario-routing-e.md`](./psychat-psm-slice-3-usuario-routing-e.md) | Usuario: exploración solo con trigger (no JSON cada turno F) | ≤1 día |

**No abrir slice 4** en este lock-in (E2EE reporte, archive export, nuevos prompts clínicos = specs aparte).

---

## Cómo ejecutar (loop)

```bash
export MOTUS_QA_LOOP=1
export MOTUS_ACTIVE_SPEC=specs/psychat-psm-slice-1-venice-routing.md
```

Un slice = **un PR** a `main`. Tras merge slice 1, validar en staging con checklist del doc de producto antes de slice 2.

---

## Definition of Done (programa completo)

- [ ] Los 3 slices mergeados en orden.
- [ ] `docs/architecture/psychat-supervisor-product.md` refleja prod.
- [ ] Evidencia: captura PSM chat (prosa) + captura reporte (5 secciones) + DevTools `mode` correctos.
- [ ] Gerardo/Benjamín sign-off clínico: **sin cambios** a `PSYCHAT_SUPERVISOR` body en slice 1–2 (solo ensamblaje QA omitido si ya acordado).

---

## Anchors

- Producto: `docs/architecture/psychat-supervisor-product.md`
- Clínico canónico: `docs/architecture/psychat-clinical-device-canonical/`
- Código: `lib/psychat-prompt.ts`, `app/api/chat/route.ts`, `lib/ai-client.ts`, `components/ui/animated-ai-chat.tsx`, `lib/psychat-chat-client.ts`
