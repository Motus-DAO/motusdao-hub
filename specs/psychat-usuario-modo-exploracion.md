# Psychat — Modo exploración (usuario) — Spec

> Status: **IN FLIGHT** — routing por trigger restaurado el 2026-11-10 (ver [`psychat-psm-slice-3-usuario-routing-e.md`](./psychat-psm-slice-3-usuario-routing-e.md)); pendiente merge + QA de producción. · Complements PSM Modo Supervisor · `safety-slice-2-psychat.md`
>
> **2026-11-10 — por qué "no respondía bien":** (a) `resolvePsychatStructuredMode` forzaba `exploracion` en cada turno de `usuario`, así que toda respuesta llevaba `Límite` + `Puente humano` + chip de handoff y el RAG nunca corría; (b) cuentas `psm` recibían el prompt supervisor —que no tiene modo conversacional— cuando hablaban en primera persona, y el modelo rechazaba explorar citando "distancia analítica / no satisfacer demandas"; (c) el saludo de usuario se renderizaba antes de hidratar el rol desde la DB. Los tres puntos están corregidos en el prompt, el routing y la hidratación de rol.

## Scope

Personas con rol `usuario` en Psychat pueden activar **modo exploración** (mismo patrón de ingeniería que Modo Supervisor, distinto contrato de contenido):

- Prompt server-owned por rol (`getPsychatSystemPrompt`).
- Trigger en último mensaje de usuario (frases listadas en `lib/psychat-prompt.ts`).
- Salida JSON estructurada (`eco`, `pregunta`, `abierto`, `limite`, `puenteHumano`).
- RAG desactivado en modo estructurado.
- UI renderiza secciones + chip **Terapeuta humano** (handoff existente `POST /api/sessions`).

## Non-goals

- Clonar dispositivo analítico / Modo Supervisor para usuarios.
- E2EE con JSON schema (E2EE sigue texto libre con prompt por rol).
- RootRouter proxy con modos estructurados (upstream QA only).

## Acceptance criteria

1. **Given** rol `usuario` y trigger exploración, **when** `POST /api/chat`, **then** `mode: exploracion` y cinco campos JSON.
2. **Given** rol `psm`, **when** trigger exploración, **then** modo QA normal (sin schema exploración).
3. **Given** rol `usuario`, **when** trigger supervisor, **then** QA (prompt indica redirigir a exploración/humano).
4. **Given** modo exploración, **when** respuesta OK, **then** RAG no corre en ese turno.
5. **Given** UI usuario, **when** chip exploración, **then** fill prompt coherente; handoff humano visible.

## Anchors

- `lib/psychat-prompt.ts`
- `app/api/chat/route.ts`
- `components/ui/animated-ai-chat.tsx`
