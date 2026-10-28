# Chat-data — documentación (slices 1–5)

> Índice para humanos, auditoría y futuro **ingest MCP/RAG** (GitBook / docs auto-hosteados).  
> Specs con AC: [`specs/chat-data-roadmap.md`](../specs/chat-data-roadmap.md) · Plan maestro: [`docs/specs/SDD-chat-data.md`](../specs/SDD-chat-data.md)

## Para usuarios (Psychat / datos)

| Tema | Dónde empezar | Doc técnica |
|------|----------------|-------------|
| Export bitácora | Botón export en bitácora | [safe-notes-export.md](../architecture/safe-notes-export.md) |
| Copia cifrada Psychat | Panel en `/psychat` + `/psychat/archivo` | [psychat-archive-export.md](../architecture/psychat-archive-export.md) |
| Resumen al profesional | `/compartir-resumen` | [consented-summary-fhir.md](../architecture/consented-summary-fhir.md) |
| Copia para entrenamiento | `/contribuir-entrenamiento` | [training-copy-consent.md](../architecture/training-copy-consent.md) |
| **Memoria de contexto (RootRouter)** | **`/psychat` → Memoria** · guía [`psychat-memoria-contexto-es.md`](../guides/psychat-memoria-contexto-es.md) | [psychat-rootrouter-context.md](../architecture/psychat-rootrouter-context.md) |

UI corta (sin terminal): ruta de app **`/psychat/memoria-contexto`**.

## Por slice (ingeniería)

| # | Spec SHIPPED | Entrega |
|---|--------------|---------|
| 1 | [slice-1-bitacora-export](../specs/chat-data-slice-1-bitacora-export.md) | Export wallet bitácora |
| 2 | [slice-2-psychat-archive](../specs/chat-data-slice-2-psychat-archive-export.md) | Archivo Psychat cifrado |
| 3 | [slice-3-consented-summary](../specs/chat-data-slice-3-consented-summary-fhir.md) | Resumen FHIR al PSM |
| 4 | [slice-4-training-copy](../specs/chat-data-slice-4-training-copy-consent.md) | Entrenamiento consentido |
| 5 | [slice-5-rootrouter](../specs/chat-data-slice-5-rootrouter-enclave.md) | RootRouter + enclaves |

## Tres ideas que no mezclar

1. **Privacidad del mensaje** (Venice TEE/E2EE) — Ajustes avanzados en Psychat.  
2. **Copias y salidas** (archivo, resumen, entrenamiento) — cada una con su consentimiento.  
3. **Memoria de contexto** (RootRouter) — dónde guarda el asistente el hilo largo; **opcional**; requiere proxy local si no usas modo Hub.

## Scripts útiles

- `scripts/psychat-rootrouter-proxy.example.sh` — arranca proxy vía `npx @rootrouter/proxy@beta`.

## Mantenimiento

Al cambiar producto: actualizar **guía usuario** → **architecture** → **spec AC** → esta tabla. Pensado para publicar los mismos `.md` fuera de GitBook.
