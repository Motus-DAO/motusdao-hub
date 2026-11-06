# Psychat PSM — Slice 1: Venice routing + modelo

> Status: **SHIPPED on `main`** at `4f04131` (checkpoint) · Pending: production verification · Depends: lock-in [`psychat-psm-supervisor-lockin.md`](./psychat-psm-supervisor-lockin.md)
>
> Anchors: `app/api/chat/route.ts`, `lib/ai-client.ts`, `lib/psychat-prompt.ts`, `lib/ai-output.ts`

---

## 1. Scope

Con rol `psm`, proveedor Venice y consentimiento IA:

1. **Enviar mensaje** → respuesta conversacional (`mode: supervisor_chat`, campo `text`) en pocos segundos (Qwen TEE).
2. **Botón reporte** → cinco campos JSON validados o 502; no texto MotusDAO.
3. Routing: structured **solo** si `requestStructuredReport === true` y hay texto de usuario.

## 2. Non-goals

- Cambiar redacción de `PSYCHAT_SUPERVISOR` / skill G.
- RootRouter proxy, E2EE reporte, archive, Motty.
- Usuario exploración (slice 3).
- Nuevos componentes UI (slice 2).

## 3. Acceptance criteria

1. **Given** `hubRole psm`, **when** `POST /api/chat` sin flag, **then** `structuredMode` null y `resolvePsychatStructuredMode` no devuelve `'supervisor'` por texto libre.
2. **Given** mismo, **when** body incluye `requestStructuredReport: true` y último user no vacío, **then** `structuredMode === 'supervisor'`.
3. **Given** PSM + venice + conversación, **when** completion OK, **then** model = `VENICE_PSM_SUPERVISOR_TEE_MODEL`, `venice_parameters` presentes, `mode: supervisor_chat`, `text` con longitud ≥ 8 y sin string `SHORT_INPUT_FALLBACK`.
4. **Given** PSM + venice + reporte, **when** JSON inválido o vacío, **then** HTTP 502 y `code: structured_output_failed` (sin fallback clínico inventado).
5. **Given** PSM + venice + conversación, **when** salida no pasa `isUsableChatOutput`, **then** HTTP 502 `code: psm_completion_unusable` (no 200 con MotusDAO).
6. **Given** ensamblaje PSM, **when** leer system prompt generado, **then** contiene `PSYCHAT_SUPERVISOR` / Dispositivo y **no** contiene bloque MotusDAO Q&A (`PSYCHAT_QA` en capacidades PSM).
7. **Negative:** **Given** `hubRole usuario`, **when** mensaje normal, **then** comportamiento no regresado (tests existentes verdes).

## 4. QA gate

- [ ] `npm test` verde (incl. `psychat-prompt.test.ts`, `psychat-structured-output.test.ts`).
- [ ] `npx tsc --noEmit` (si corre en CI).
- [ ] Manual: cuenta PSM, TEE, un caso clínico → prosa; botón → secciones o error claro.

## 5. Exit conditions

Slice 1 done cuando criterios 1–7 pasan y PR mergeado a `main`.

## 6. Decisions — LOCKED (this slice)

- Implementación ya esbozada en working tree; **falta merge + deploy** para que deje de “no funcionar” en prod.
- No reintroducir prod bug F (`if hubRole psm return supervisor` sin flag).
