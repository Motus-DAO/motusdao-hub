# Diferencias: textos originales vs `lib/psychat-prompt.ts`

**Referencia producción:** `literal/F-motusdao-hub-origin-main-0f35444-psychat-prompt.ts.full`  
**Referencia conversacional histórica (PSM):** `literal/B-chat-alpha-a25e541-SYSTEM_PROMPT.literal.txt` + routing «solo con modo supervisor»  
**Referencia dispositivo ético-lógico completo:** `literal/G-chat-alpha-motusai_skill_md.md.full`  
**Working tree local (NO canónico):** `reference/RECONSTRUCTION-worktree-psychat-prompt.ts`

---

## 1. Primer system prompt de Supervisor (línea de tiempo)

| Fecha (commit) | Repo | Texto | Dispositivo |
|----------------|------|-------|-------------|
| 2025-09-10 `d8cfe56` | ChatAlpha | PSM genérico «técnicas, evidencia» | **No** lacaniano |
| 2025-09-13 `a25e541` | ChatAlpha | `SYSTEM_PROMPT` bloque B «Modo Supervisor» | **Sí** — 5 secciones, ciclo lógico, Dispositivo, few-shots |
| 2026-10-08 `dec3b3e` | ChatAlpha | «Modo de revisión» (suavizado legal) | Parcial — misma estructura 5 campos, **sin** Dispositivo/disponibilidad |
| 2025-10+ `d49d09f` | Hub | `PSYCHAT_SUPERVISOR` en TS | Sí — Dispositivo + Disponibilidad; **sin** ciclo lógico ni «Medios de la cura» |
| 2026 `0f35444` | Hub | Igual texto supervisor que E | **Routing:** cada turno PSM → JSON |
| 2026 worktree | Hub | `PSYCHAT_SUPERVISOR_CHAT/REPORT/CLINICAL` | **Reconstrucción agente** — no está en Git remoto |

---

## 2. Acompañamiento usuarios — tres capas distintas

| Capa | Origen | Formato | Literal en |
|------|--------|---------|------------|
| ChatAlpha 2025 | `d8cfe56` | Prosa empática, mindfulness, autoayuda | `U-chat-alpha-d8cfe56-role-prompts.literal.txt` |
| MotusAI skill | G/H §6.1 | Reglas ético-lógicas, **sin** 5 secciones JSON | `N-skill-6.1-user-mode.literal.md` |
| Hub Psychat | E/F `PSYCHAT_EXPLORACION` | 5 campos JSON (eco, pregunta, …) **cada turno usuario** desde `0f35444` | `E` / `F` |

**Conclusión:** el script Hub de exploración **no** aparece en Chat-MotusAI histórico; deriva del port a Hub (`d49d09f`). El acompañamiento «original» más cercano al dispositivo Benjamín/Gerardo en texto largo es el **skill MotusAI**, no `PSYCHAT_EXPLORACION`.

---

## 3. Few-shots y reglas conversacionales

| Fuente | Few-shots supervisor | Reglas conversacionales |
|--------|----------------------|------------------------|
| B / D (ChatAlpha) | 2 casos celos / vacío → estilo 5 secciones | Ciclo lógico, Medios de la cura, directrices 1–8 |
| C (legal pilot) | Idem | Directrices 7–8 **prohiben** ofrecer supervisión humana |
| E / F (Hub) | Idem estilo resumido | Directrices 1–7 **sin** notación lógica |
| G/H skill | §14–15 (usuario y PSM) | §7 (saludo, demanda, **un significante**, fin → Dispositivo) |
| `/api/motusai` supervision | JSON §16 + `response` string | Skill completo + «single JSON object» |

---

## 4. Tabla diff: bloques vs `F` (producción Hub)

| Elemento | B/D ChatAlpha | E/F Hub (`PSYCHAT_*`) | G/H skill |
|----------|---------------|------------------------|-----------|
| Q&A MotusDAO en prompt PSM | Sí (A) | Sí (`PSYCHAT_QA`) | No en §6.2 |
| Ciclo ∃∀¬ | Sí | **No** | Cuadrante §5.1 (otra forma) |
| Dispositivo Verificación Casos | Sí (B/D) | Sí | §7.5 |
| «Modo de revisión» sin Dispositivo | Solo C | No | No |
| Trigger supervisor vs cada turno | Trigger | F: **cada turno** | N/A (otra API) |
| Intro «Eres Psychat…» | «Asistente Oficial» | Sí | MotusAI-Psychat EN |
| Seguridad Hub | Una línea | `PSYCHAT_SAFETY` ampliada | §4 + §8–10 |
| Usuario 5 campos | No en chat route | `PSYCHAT_EXPLORACION` | No (§6.1 distinto) |

---

## 5. Qué usar como «canónico» verificable

| Necesidad | Fuente literal recomendada |
|-----------|----------------------------|
| Reporte 5 campos + Dispositivo (texto más antiguo en `/api/chat`) | **B** o **D** |
| Supervisión conversacional + cuadrante + reglas operativas | **G** o **H** (runtime motusai) |
| Pilot legal Oct 2026 (sin prometer supervisión humana en copy) | **C** (estado actual ChatAlpha route) |
| Producto Hub Oct 2026 prod | **F** |
| Formación clínica Benjamín (autoría explícita) | **K–M** |
| Evitar como canon | **RECONSTRUCTION-worktree**, **A**, **U** (pre-lacaniano) |

---

## 6. Recuperación del comportamiento conversacional PSM (evidencia)

- **Comportamiento:** ChatAlpha B + código: structured JSON **solo** si el usuario escribe trigger (`wantsSupervisorMode`). Entre medias, el modelo recibe el mismo prompt pero responde **prosa** (modo Q&A + instrucciones supervisor en system, sin `response_format`).
- **MotusAI `/api/motusai`:** modo `supervision` devuelve JSON con campo **`response`** (pregunta/disparador conversacional), no las 5 secciones del Hub.
- **Hub `0f35444`:** rompe ese comportamiento al forzar structured en **todo** turno PSM — cambio de **routing**, no solo de redacción del párrafo supervisor.

Esta diff **no** propone parches; solo documenta procedencia.
