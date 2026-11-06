# Psychat PSM — Slice 3: Usuario routing (paridad E)

> Status: **READY** · Slice 1 is in `main` (`4f04131`); this slice restores trigger-based routing for `usuario` · Complements [`psychat-usuario-modo-exploracion.md`](./psychat-usuario-modo-exploracion.md)

---

## 1. Scope

Restaurar routing **E** para `hubRole usuario` en `resolvePsychatStructuredMode`:

- Exploración JSON **solo** con trigger (`wantsExploracionMode`), no cada turno (bug F).
- PSM no afectado (slice 1).

## 2. Non-goals

- Cambiar copy `PSYCHAT_EXPLORACION`.
- Modelo Venice usuario (puede seguir `getAIModel()` salvo decisión aparte).

## 3. Acceptance criteria

1. **Given** usuario + “hola”, **when** chat, **then** no `mode: exploracion` forzado.
2. **Given** usuario + trigger exploración, **when** chat, **then** cinco campos JSON (spec usuario existente).

## 4. Exit conditions

Tests `psychat-prompt.test.ts` + spec usuario AC 1–5 siguen verdes.
