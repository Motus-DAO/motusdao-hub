# PsyChat / MotusAI — archivo canónico del dispositivo clínico

**Propósito:** conservar textos **recuperados literalmente** del historial Git y fuentes MotusDAO, separados de **reconstrucciones** recientes (p. ej. parches de Cursor en el working tree).

**Autoría clínica declarada (MCP / Praxis):** Benjamín Buzali (contenido clínico original en Academy); Gerardo Alvarez (decisión de producto y arquitectura comercial). Los prompts embebidos en código no siempre llevan firma inline — la procedencia se documenta por **commit** y **repositorio**.

**Equivalencia de repos locales**

| Nombre MCP / whitepaper | Ruta local verificada |
|-------------------------|------------------------|
| `Chat-MotusAI` | `/Users/brahma101/Projects/Work/MotusDAO/repositories/Apps/ChatAlphaMotusDAO` |

No se encontró otro clon local con el slug exacto `Chat-MotusAI` en esta máquina (oct 2026).

---

## Cómo leer esta carpeta

| Carpeta | Significado |
|---------|-------------|
| `literal/` | Copia **byte-a-byte** (o extracción acotada) de un commit o archivo fuente; incluye metadatos en el nombre del archivo. |
| `reference/` | Material curricular Benjamín (no es prompt de runtime) o **RECONSTRUCTION** explícita. |

**Regla:** si el nombre no dice `RECONSTRUCTION`, trátalo como recuperación literal del path indicado en el nombre.

---

## Índice de artefactos literales

### Supervisor — evolución en `app/api/chat/route.ts` (ChatAlpha / Chat-MotusAI)

| ID | Archivo | Origen Git | Notas |
|----|---------|------------|-------|
| A | `literal/A-chat-alpha-d8cfe56-route.ts.full` | `ChatAlphaMotusDAO` `d8cfe56` (2025-09-10) | **Pre-lacaniano.** PSM/usuario genérico (técnicas, mindfulness). No es el dispositivo Benjamín/Gerardo posterior. |
| B | `literal/B-chat-alpha-a25e541-SYSTEM_PROMPT.literal.txt` | `a25e541` (2025-09-13, SolDAO) | **Primera aparición** del bloque «Modo Supervisor» + ciclo lógico + few-shots + Dispositivo de Verificación de Casos en la ruta `/api/chat`. |
| D | `literal/D-chat-alpha-pre-dec3b3e-SYSTEM_PROMPT.literal.txt` | `dec3b3e^` (padre de MVP legal) | Igual familia que B (Modo Supervisor + Dispositivo). |
| C | `literal/C-chat-alpha-dec3b3e-SYSTEM_PROMPT-legal-pilot.literal.txt` | `dec3b3e` (2026-10-08, gerryalvrz) | **Variante legal MVP:** renombra a «Modo de revisión», quita Dispositivo/disponibilidad clínica, añade «no ofrecer supervisión humana». **Sigue siendo HEAD** del repo ChatAlpha en disco. |

**Comportamiento de routing (literal en código):** en B/C/D, el JSON de 5 campos solo se activa con `wantsSupervisorMode` en el **último** mensaje del usuario (`modo supervisor`, etc.). Fuera de eso: Q&A MotusDAO + conversación libre con el mismo `SYSTEM_PROMPT`.

### Hub PsyChat (`motusdao-hub`)

| ID | Archivo | Commit | Notas |
|----|---------|--------|-------|
| E | `literal/E-motusdao-hub-d49d09f-psychat-prompt.ts.full` | `d49d09f` | Primer `lib/psychat-prompt.ts` consolidado; supervisor **solo bajo trigger**; añade **modo exploración** usuario (5 campos). |
| F | `literal/F-motusdao-hub-origin-main-0f35444-psychat-prompt.ts.full` | `origin/main` @ `0f35444` | PSM → supervisor estructurado **en cada turno**; usuario → exploración **en cada turno**. |

### MotusAI skill (dispositivo ético-lógico completo)

| ID | Archivo | Procedencia | SHA-256 |
|----|---------|-------------|---------|
| G | `literal/G-chat-alpha-motusai_skill_md.md.full` | `ChatAlphaMotusDAO/motusai_skill_md.md` | `0ed9c9d4…54875` |
| H | `literal/H-chat-alpha-prompts-motusai-skill.md.full` | `ChatAlphaMotusDAO/prompts/motusai-skill.md` (cargado por `/api/motusai`) | `5f0e6453…532a` |
| I | `literal/I-mcp-clinical-policy-motusai-skill.md.full` | MCP sync `content/clinical-policy/motusai-skill.md` | igual a G en esta copia |

### Extractos literales del skill (desde G)

| ID | Archivo | Sección |
|----|---------|---------|
| N | `literal/N-skill-6.1-user-mode.literal.md` | §6.1 User Mode |
| O | `literal/O-skill-6.2-professional-mode.literal.md` | §6.2 Professional / PSM |
| P | `literal/P-skill-7-analytical-rules.literal.md` | §7 Reglas operativas (saludo, demanda, un significante, Dispositivo) |
| Q–T | `literal/Q-…` through `T-skill-16-…` | Estilo, buenos/malos ejemplos, JSON sugerido §16 |

| U | `literal/U-chat-alpha-d8cfe56-role-prompts.literal.txt` | Prompts PSM/usuario **pre-lacanianos** (2025-09-10) |

**G ≠ H:** dos archivos distintos en el mismo repo; la ruta `motusai` usa **H** en runtime.

### Q&A producto (no dispositivo clínico)

| ID | Archivo | Fuente |
|----|---------|--------|
| J | `literal/J-chat-alpha-motusai-route-QA_SYSTEM_PROMPT.literal.txt` | `ChatAlphaMotusDAO/app/api/motusai/route.ts` constante `QA_SYSTEM_PROMPT` |

### Academy Benjamín (formación Praxis — **no** prompt live de Psychat)

| ID | Archivo |
|----|---------|
| K–M | `reference/K-benja-00-arquitectura.md`, `L-benja-01-escucha.md`, `M-benja-02-formulacion.md` |

Copiados desde `MCP-MotusDAO/content/academy/benja/` (front matter: `author: Benjamín Buzali`, `decision_owner: Gerardo Alvarez`).

---

## Reconstrucciones (NO canónicas)

| Archivo | Qué es |
|---------|--------|
| `reference/RECONSTRUCTION-worktree-psychat-prompt.ts` | Snapshot **local sin commit** del working tree de `motusdao-hub` (modos `supervisor_chat` / `supervisor_report`, textos redactados por el agente). **No sustituye** B/D/E/F ni el skill MotusAI. |

---

## Diferencias frente a `lib/psychat-prompt.ts` en producción (`origin/main`)

Ver **`DIFF-vs-current-production.md`**.

Resumen ejecutivo:

1. **Conversación PSM:** en ChatAlpha (B/D) y Hub `d49d09f` (E), el supervisor lacaniano **no** imponía 5 secciones salvo trigger; en `0f35444` (F) **sí** cada turno PSM.
2. **Texto supervisor:** E/F **eliminan** el ciclo lógico explícito `(∃x¬ϕ(x)→…)` y «Medios de la dirección de la cura» presentes en B/D; mantienen Dispositivo + Disponibilidad (como B, no como C).
3. **Usuario:** el acompañamiento original en ChatAlpha era el skill **§6.1 User Mode** (G/H) vía `/api/motusai`; en Hub, **PSYCHAT_EXPLORACION** (E/F) es un guion **nuevo** de producto (5 campos, sin jerga lacaniana).
4. **MotusAI supervision path:** `/api/motusai` usa skill completo + JSON con campo `response` conversacional (§16), **no** el schema `apertura/reflexion/…` de `/api/chat`.

---

## Uso recomendado

1. Para **dispositivo clínico conversacional** (PSM): skill G/H §6.2 + §7 + §13–15, más routing «una pregunta / un significante».
2. Para **reporte estructurado 5 campos:** B o D (Dispositivo) o bloque `PSYCHAT_SUPERVISOR` en E — **solo bajo solicitud explícita**, como en B/C/D routing.
3. Para **usuario final en Hub:** E/F `PSYCHAT_EXPLORACION` (producto Hub), cruzar con §6.1 del skill para ética general.

**No se hizo commit ni push.** Los archivos de aplicación (`lib/psychat-prompt.ts`, etc.) no fueron modificados en esta recuperación.
