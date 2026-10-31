# Propuesta de ingeniería (solo routing / ensamblaje) — sin cambiar strings clínicos

**Estado:** propuesta; **no implementada.**  
**Autoría clínica:** cualquier edición a `PSYCHAT_*`, skill G, o bloque B requiere Benjamín + Gerardo.  
**Referencia comportamiento deseado:** `literal/E-motusdao-hub-d49d09f-psychat-prompt.ts.full` + routing ChatAlpha en `literal/B-…` (structured solo con trigger).

---

## Diff mínimo sugerido (archivos)

### 1. `lib/psychat-prompt.ts`

Restaurar **`resolvePsychatStructuredMode`** exactamente como en **E** (`d49d09f`):

```diff
 export function resolvePsychatStructuredMode(...): PsychatStructuredMode | null {
-  if (!userText.trim()) return null
-  if (hubRole === 'psm') return 'supervisor'
-  return 'exploracion'
+  if (hubRole === 'psm' && wantsSupervisorMode(userText)) return 'supervisor'
+  if (hubRole === 'usuario' && wantsExploracionMode(userText)) return 'exploracion'
+  return null
 }
```

**No editar** constantes `PSYCHAT_SUPERVISOR`, `PSYCHAT_QA`, `PSYCHAT_SAFETY`, `PSYCHAT_EXPLORACION`.

Opcional (producto, requiere aprobación clínica de *ensamblaje*, no de redacción):

```diff
 export function getPsychatSystemPrompt(hubRole: PsychatHubRole): string {
   ...
   hubRole === 'psm'
-    ? `Capacidades:\n${PSYCHAT_QA}\nB) ${PSYCHAT_SUPERVISOR}\n\n...`
+    ? `${PSYCHAT_SUPERVISOR}\n\n...\n\n${PSYCHAT_SAFETY}...`  // omitir PSYCHAT_QA en runtime PSM
```

Sin aprobación: dejar ensamblaje E/F intacto; el beneficio principal viene del routing.

Actualizar tests en `lib/psychat-prompt.test.ts` y `lib/psychat-structured-output.test.ts` a expectativas **E**.

Eliminar del working tree (si se mergea): bloques `RECONSTRUCTION-worktree-*` (`PSYCHAT_SUPERVISOR_CHAT`, etc.).

### 2. `app/api/chat/route.ts`

Cuando `structuredMode === null` y `hubRole === 'psm'`:

- Una sola llamada `createReliableChatCompletion` con `getAIModel()`, temp 0.7, max_tokens ~800.
- Respuesta JSON: `{ mode: 'supervisor_chat' | 'qa', text, psychatHubRole, credit, ... }` (nombre de modo acoplado a UI; **no** cambia prompts).
- **No** añadir `veniceStructuredJsonReminder` salvo `structuredMode !== null`.
- Mantener rama structured actual para `supervisor` (reporte) y `exploracion` (usuario con trigger en E; ver nota F abajo).

Rama reporte PSM (structured `supervisor`):

- Conservar Qwen + `getVeniceSupervisorTeeParameters` + validación 5 campos + 502 sin fallback clínico (ingeniería ya presente en working tree / staging).

Quitar opciones `getPsychatSystemPrompt(..., { supervisorReport })` unless approved; usar **un solo** `getPsychatSystemPrompt(hubRole)` como **F**.

### 3. `components/ui/animated-ai-chat.tsx`

```diff
- if (data.mode === 'supervisor' && data.apertura) { formatSupervisorMarkdown(...) }
+ if ((data.mode === 'supervisor' || data.mode === 'supervisor_report') && data.apertura) { formatSupervisorMarkdown(...) }
+ else if (data.mode === 'supervisor_chat' && data.text) { content = data.text }
```

(Equivalente si se mantiene `mode: 'qa'` para PSM texto libre como en **E** route: renderizar `text` sin markdown de secciones.)

### 4. Sin tocar

- `motusai_skill_md.md`, canonical `literal/G-*`
- E2EE navegador, RootRouter, Motty
- `PSYCHAT_SAFETY` / consent / auth

---

## Nota usuario `exploracion`

**F** también forzó exploración JSON cada turno usuario (`0f35444`). Recuperar solo PSM no restaura usuario histórico; scope aparte si se desea paridad **E** completa.

---

## Qwen, créditos, seguridad

| Aspecto | Efecto del routing E |
|--------|----------------------|
| **Qwen** | Solo cuando `structuredMode === 'supervisor'` (trigger). Turnos PSM normales → `VENICE_MODEL` default. |
| **Créditos** | `reserveAiCredit` ya recibe `model` distinto por rama; chat ~800 tokens DeepSeek; reporte ~1200 Qwen. |
| **Seguridad** | Sin cambio: `PSYCHAT_SAFETY`, consent, 502 sin JSON falso. |
| **RAG** | En E, PSM con `structuredMode null` podía activar RAG; working tree ya desactiva RAG para PSM — decisión producto menor. |
