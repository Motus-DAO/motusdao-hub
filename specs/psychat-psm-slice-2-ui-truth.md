# Psychat PSM — Slice 2: UI truth table + proxy

> Status: **DRAFT** · Blocked until slice 1 merged

---

## 1. Scope

Psychat UI refleja el contrato de `docs/architecture/psychat-supervisor-product.md`:

- Normal send → espera `supervisor_chat` + `text`.
- Reporte → `supervisor_report` + markdown secciones.
- Errores 502 → banner con mensaje API (no burbuja con fallback MotusDAO).
- **PSM:** desactivar o advertir RootRouter proxy (no `sendPsychatViaRootRouterProxy` para rol psm).

## 2. Non-goals

- Rediseño visual Psychat.
- E2EE structured report.

## 3. Acceptance criteria

1. **Given** PSM + proxy context on, **when** enviar mensaje, **then** usa `/api/chat` Hub (o UI bloquea proxy con copy claro).
2. **Given** respuesta `psm_completion_unusable`, **when** render, **then** `setError` con texto API, no assistant bubble MotusDAO.
3. **Given** reporte OK, **when** render, **then** headers markdown supervisor visibles.

## 4. Exit conditions

Manual screenshot chat + reporte + error 502 simulado (test o mock).
