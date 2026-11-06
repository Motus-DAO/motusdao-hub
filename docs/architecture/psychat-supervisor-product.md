# Psychat — producto del supervisor PSM (ingeniería)

> **No es el dispositivo clínico.** Los textos aprobados viven en `docs/architecture/psychat-clinical-device-canonical/` y `lib/psychat-prompt.ts` (`PSYCHAT_SUPERVISOR`, etc.). Este doc fija **cómo debe comportarse el Hub** para que el dispositivo llegue intacto al modelo y a la UI.
>
> **Relacionado:** acompañamiento digital **usuario** → `specs/psychat-usuario-modo-exploracion.md` (otro contrato; no mezclar con PSM).

---

## Tres superficies (no confundir)

| Superficie | Rol | Propósito | Ruta típica |
|------------|-----|-----------|-------------|
| **Motty** | cualquiera en Hub | FAQ MotusDAO, RAG | otras páginas / asistente general |
| **Psychat PSM** | `psm` | Supervisión analítica para profesionales | `POST /api/chat` + prompt PSM |
| **Psychat usuario** | `usuario` | Exploración conversacional + modo exploración JSON | mismo route, otro prompt |

Si la respuesta suena a *“¿en qué puedo ayudarte sobre MotusDAO?”*, el usuario **no** está en el pipeline PSM correcto (fallback Hub o proxy QA).

---

## Supervisor PSM — comportamiento deseado (producto)

### Conversación normal (enviar mensaje)

- **Entrada:** caso clínico anonimizado en lenguaje natural (turnos user/assistant).
- **Salida:** **prosa** en español: escucha analítica, preguntas abiertas, cadencia de supervisión (como plática con supervisor), **sin** forzar las cinco secciones en cada turno.
- **Prompt:** `getPsychatSystemPrompt('psm')` — dispositivo `PSYCHAT_SUPERVISOR`; **no** incluir bloque `PSYCHAT_QA` en runtime PSM (Motty no debe competir en el mismo system prompt).
- **RAG MotusDAO:** desactivado para `hubRole === 'psm'`.

### Reporte estructurado (botón explícito)

- **Entrada:** mismo hilo + `requestStructuredReport: true` en el body.
- **Salida:** JSON validado → UI con secciones *Apertura de significantes*, *Reflexión*, *Cierre analítico*, *Recomendación*, *Disponibilidad* (`formatSupervisorMarkdown`).
- **Calidad de referencia:** respuestas lacanianas estructuradas como las que el equipo ya validó en producción cuando el modelo cumple schema (capturas internas oct-2026).
- **Fallo:** HTTP **502** con código claro — **nunca** inventar texto clínico ni mostrar fallback MotusDAO.

### Privacidad / rutas prohibidas para PSM clínico

| Modo | PSM conversación | PSM reporte |
|------|------------------|-------------|
| TEE (`privacyMode: tee`) | `POST /api/chat` Hub | `POST /api/chat` Hub |
| E2EE navegador | texto libre vía Venice E2EE (sin reporte estructurado en UI) | deshabilitado en UI |
| RootRouter proxy (`local_rootrouter` / enclave con proxy) | **no** usar para PSM productivo — bypassa dispositivo Hub | **no** |

---

## Matriz de modelo (Venice / TEE)

| `hubRole` | Modo | Proveedor | Modelo | Notas |
|-----------|------|-----------|--------|--------|
| `psm` | conversación (`structuredMode === null`) | venice | Qwen supervisor TEE (`VENICE_PSM_SUPERVISOR_TEE_MODEL`) | `getVeniceSupervisorTeeParameters()`, temp ~0.65 |
| `psm` | reporte (`structuredMode === 'supervisor'`) | venice | mismo Qwen | temp ~0.55 + recordatorio JSON; validar 5 campos |
| `usuario` | exploración JSON | openai / venice | según slice usuario | fuera de lock-in PSM |
| otro | QA | `getAIModel()` | DeepSeek u OpenAI | no aplica a PSM venice |

**Anti-patrón:** PSM en Venice con `getAIModel()` (DeepSeek) → latencia alta, salida vacía, `SHORT_INPUT_FALLBACK` (*MotusDAO*).

---

## Contrato API (resumen)

**`POST /api/chat`** (sesión + consentimiento IA)

- Body: `{ messages, requestStructuredReport?: boolean }`
- PSM conversación OK: `{ mode: 'supervisor_chat', text, psychatHubRole: 'psm', ... }`
- PSM reporte OK: `{ mode: 'supervisor_report', apertura, reflexion, cierre, recomendacion, disponibilidad, ... }`
- PSM fallo modelo: `{ code: 'psm_completion_unusable' | 'structured_output_failed', error }` → **502**

---

## Estado en `main` (nov-2026)

`main` incluye el checkpoint `4f04131`: PSM conversa en prosa por defecto y el reporte
estructurado se pide con el botón. El spec del slice 1
(`specs/psychat-psm-slice-1-venice-routing.md`) sigue marcado READY: trátalo como shipped en
código y **pendiente de verificación en producción**.

Pendiente: slice 2 (proxy RootRouter apagado para PSM) y slice 3 (usuario solo con trigger).
Estado vivo: `specs/STATUS.md`.

---

## Checklist antes de decir “no funciona”

1. ¿Usuario en DB con `role: psm`?
2. ¿Despliegue incluye el slice mergeado (no solo cambios locales)?
3. ¿Psychat en TEE, sin proxy RootRouter activo en ajustes de contexto?
4. ¿`AI_PROVIDER=venice` y key presente en el entorno?
5. En DevTools → respuesta de `/api/chat`: `mode`, `text` vs campos `apertura`, o `error` / `code`.

---

## Autoría clínica

Cambios a redacción de `PSYCHAT_*`, skill MotusAI o bloques canónicos B/E/F → **Benjamín + Gerardo**. Este documento y los specs SDD solo autorizan **routing, modelo, UI y ensamblaje** (p. ej. omitir `PSYCHAT_QA` en PSM).
