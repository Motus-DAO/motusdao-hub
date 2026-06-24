# PSM Intake v1 — Polish Spec

> Status: **DRAFT for review** · Owner: product + eng · Flow is **frozen** (steps stay as-is; this is a polish pass, not a redesign).
>
> Purpose: one source of truth for the PSM (Profesional de la Salud Mental) registration form so we stop patching field-by-field. Built from the current codebase: `lib/intake/psm-intake-v1.ts`, `app/api/onboarding/psm/route.ts`, `lib/onboarding-store.ts`, `prisma/schema.prisma`.

---

## 1. Frozen journey

Main wizard (`OnboardingWizard.tsx`) — **do not change order or count**:

| # | Step | Component | Job |
|---|------|-----------|-----|
| 0 | Cuenta WaaP | `StepConnect` | SIWE / email + wallet |
| 1 | Celo & dominio | `StepBlockchain` | CELO + MNS domain |
| 2 | Rol | `StepRoleSelection` | Choose PSM |
| 3 | Perfil profesional | `PsmIntakeWizard` (4 sub-steps) | The intake form |
| 4 | Revisión | `StepRevision` | Read-only summary + submit |
| 5 | Listo | `StepExito` | Pending verification |

PSM sub-wizard (step 3) — **frozen**, FHIR-aligned buckets:

| Sub | Screen | Component | FHIR analog |
|-----|--------|-----------|-------------|
| 0 | Identidad y credenciales | `PsmIdentityStep` | `Practitioner` identity + `qualification` |
| 1 | Tu práctica | `PsmPracticeStep` | `Practitioner.text` + `PractitionerRole.specialty` |
| 2 | Operación | `PsmOperationsStep` | `PractitionerRole.availableTime` + extensions |
| 3 | Documentos | `PsmDocumentsStep` | verification artifacts |

Alt path: chat intake (`StepAIIntake`) writes the same fields, then lands on Documentos.

---

## 2. Field matrix (source of truth)

Legend — **Req**: required to pass that sub-step. **Control**: target UX control (polish goal). **DB**: Prisma column. Tables: `Profile` (P), `PSMProfile` (PSM), `User` (U), `ConsentRecord` (C).

### Sub-step 0 — Identidad y credenciales

| Field | Label (ES) | Req | Control | DB | Validation message |
|-------|-----------|-----|---------|----|--------------------|
| `avatarUrl` / `avatarStoragePath` | Foto de perfil | No | File upload | P.avatarUrl / P.avatarStoragePath | — |
| `nombre` | Nombre | Yes | Text | P.nombre | El nombre es obligatorio |
| `apellido` | Apellidos | Yes | Text | P.apellido | El apellido es obligatorio |
| `telefono` | Teléfono | Yes | Tel | P.telefono | Formato de teléfono inválido |
| `fechaNacimiento` | Fecha de nacimiento | Yes | Date | P.fechaNacimiento | La fecha de nacimiento es obligatoria |
| `ciudad` | Ciudad | Yes | Text | P.ciudad | La ciudad es obligatoria |
| `pais` | País | Yes | Select | P.pais | El país es obligatorio |
| `cedulaProfesional` | Cédula profesional | Yes | Text | PSM.cedulaProfesional | La cédula profesional es obligatoria |
| `formacionAcademica` | Formación académica | Yes | Text | PSM.formacionAcademica | La formación académica es obligatoria |
| `experienciaAnios` | Años de experiencia | Yes | Number | PSM.experienciaAnios | Los años de experiencia deben ser 0 o mayor |

### Sub-step 1 — Tu práctica

| Field | Label (ES) | Req | Control | DB | Validation message |
|-------|-----------|-----|---------|----|--------------------|
| `professionalNarrative` | Cuéntanos sobre tu práctica profesional | Yes (min 80) | Textarea + live counter | PSM.professionalNarrative (+ biografia mirror) | Amplía tu descripción: faltan N caracteres |
| `therapyStyles` | Enfoque terapéutico | Yes (≥1) | **Chips + tag input** | PSM.therapyStyles (JSONB) | Selecciona o escribe al menos un enfoque |
| `especialidades` | Especialización / temas | Yes (≥1) | **Chips + tag input** | PSM.especialidades (JSONB) | Selecciona o escribe al menos una especialización |
| `languages` | Idiomas | Yes (≥1) | Chips | PSM.languages (JSONB) | Selecciona al menos un idioma |

> **Modalidad:** removed from intake. MotusDAO is **teletherapy (video) only**. `modalities` is hard-set to `['video']` in `buildPsmApiPayload`; the DB column stays for compatibility but is not user-editable.

### Sub-step 2 — Operación

| Field | Label (ES) | Req | Control | DB | Validation message |
|-------|-----------|-----|---------|----|--------------------|
| `licensedCountries` | Países donde puedes atender | Yes (≥1) | Chips | PSM.licensedCountries (JSONB) | Selecciona al menos un país |
| `timezone` | Zona horaria | Yes | Text (autofilled) | PSM.timezone | La zona horaria es obligatoria |
| `weeklyTherapyHours` | Horas semanales para terapia | Yes (1–80) | Number | PSM.availability `{weeklyTherapyHours}` (JSONB) | Indica al menos 1 hora semanal |
| `worksWithUrgencyLevels` | Niveles de urgencia | Yes (≥1) | Chips | PSM.worksWithUrgencyLevels (JSONB) | Selecciona al menos un nivel de urgencia |
| `maxActiveUsers` | Usuarios activos que puedes atender | Yes (>0) | Number | PSM.maxActivePatients ⚠️ | Los usuarios activos deben ser mayor a 0 |
| `exclusionCriteria` | Casos que no tomas | No | Chips | PSM.exclusionCriteria (JSONB) | — |
| `isAcceptingUsers` | Recibir usuarios tras aprobación | No | Checkbox | PSM.isAcceptingPatients ⚠️ | — |
| `acceptsSlidingScale` | Escala flexible de honorarios | No | Checkbox | PSM.acceptsSlidingScale | — |
| `participaSupervision/Cursos/Investigacion/Comunidad` | Preferencias de plataforma | No | Toggles | PSM.participa* | — |

### Sub-step 3 — Documentos

| Field | Label (ES) | Req | Control | DB | Validation message |
|-------|-----------|-----|---------|----|--------------------|
| `cedulaDocumentPath` | Documento de cédula | Yes* | File upload | PSM.cedulaDocumentPath | — |
| `tituloDocumentPath` | Documento de título | Yes* | File upload | PSM.tituloDocumentPath | — |

\* **At least one** of cédula/título required (superRefine on `cedulaDocumentPath`). Message: *Debes subir al menos un documento: cédula profesional o título.*

### Meta / consents (not collected on their own screen today)

| Field | Req | DB | Note |
|-------|-----|----|------|
| `email`, `eoaAddress`, `smartWalletAddress`, `privyId` | Yes | U | From WaaP session |
| `intakeSource` | Yes | U.intakeSource | manual / ai_assisted / hybrid |
| `motusName`, `mnsTxHash`, `profileNftTxHash`, `profileNftTokenURI` | No | U | From Celo/MNS step |
| `consentToTerms`, `consentToPrivacy` | Yes | C | ⚠️ See gap #4 |
| `consentToAIProcessing` | No | C | |

---

## 3. Discrepancies found in current code (must resolve in polish)

These are the concrete reasons it feels clunky. Each needs a decision.

1. **Two schemas, no single source of truth.** `psmIntakeV1Schema` (canonical, in `psm-intake-v1.ts`) is **not** used by the API — `app/api/onboarding/psm/route.ts` defines its own `psmOnboardingSchema`. They drift (e.g. consents, naming). → **Fix:** API should import/derive from the canonical schema.

2. **Dual naming `maxActiveUsers` ↔ `maxActivePatients`.** UI/store uses `maxActiveUsers`; API + DB use `maxActivePatients`. Same for `isAcceptingUsers` ↔ `isAcceptingPatients`. Works via mapping but is error-prone. → **Fix:** keep one UI name, map in exactly one place (`buildPsmApiPayload`).

3. **"Otro" overload (the visible bug).** `'otro'`/`'otros'` is both a stored array value and a UI affordance, merged inconsistently. → **Fix:** replace with **chips + tag input** (no "Otro" chip). Custom values stored as plain strings alongside presets.

4. **Consents are auto-accepted, never shown.** API defaults `consentToTerms`/`consentToPrivacy` to `true`; canonical schema demands `literal(true)`; there is **no consent UI**. Legally weak and a schema contradiction. → **Decision needed:** add a consent checkbox to Revisión, or an explicit consent block. (Recommended: checkboxes on Revisión before submit.)

5. **`especialidades`/`therapyStyles` stored as raw display/slug mix.** Need to decide slug vs display text for custom entries (see Q1).

---

## 4. Validation strategy (one rule, applied everywhere)

Per research ([USWDS](https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/), [Smashing live-validation](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/), [WCAG forms](https://inculva.com/kb/guides/forms-accessibility-patterns/)):

- **Block "Continuar" on the current sub-step only.** Never validate later sub-steps.
- **Inline error at the field** + a **summary banner** at top of the sub-step listing what's missing (friendly Spanish, names the field + how to fix). This is the `PsmStepValidationBanner` already started — standardize it.
- **Reward early, punish late:** validate on blur; once a field is invalid, re-validate on change so the error clears as soon as it's fixed.
- **Error copy:** human + actionable. Never raw Zod keys (the original complaint).
- **Submit is the safety net:** API re-validates with the same schema; UI mirrors it.
- **Accessibility:** `aria-invalid`, `aria-describedby`, move focus to first error / step heading on failed Continue, `aria-current="step"` on stepper.

---

## 5. Multi-select + custom pattern (replaces "Otro")

**Chosen pattern: preset chips + "Agregar otro…" tag input.**

- Presets render as chips (current grid is fine).
- Below the grid: a small input — type a value, press Enter/comma → adds a removable **tag**.
- Stored as one array: `['cognitivo', 'EMDR']`. No `'otro'` token.
- Same component reused by: `PsmPracticeStep`, `StepRevision` (edit), `IntakeLiveForm`, AI-intake merge.

Applies to: `therapyStyles`, `especialidades`. (Optionally `exclusionCriteria` later.)

---

## 6. Test workflow (same wallet, repeatable)

1. `source .env.local && npm run dev:reset-onboarding -- --eoa=0xTESTWALLET`
2. Browser console: `localStorage.removeItem('motusdao-onboarding-storage'); location.assign('/onboarding')`
3. Re-run the flow (same SIWE session, no new EOA).

### Acceptance checklist (run before "done")

- [ ] Happy path: all valid → submit 201, row in `PSMProfile` + `Profile` + `ConsentRecord`
- [ ] Narrative < 80 chars → blocked on sub-step 1 with friendly message
- [ ] No especialización (neither chip nor tag) → blocked
- [ ] Custom enfoque only (tag, no chip) → saves and shows on Revisión
- [ ] No idioma / modalidad → blocked
- [ ] Missing timezone / weekly hours / urgency / capacity → blocked on sub-step 2
- [ ] No document → blocked on sub-step 3
- [ ] Both documents uploaded → passes
- [ ] Back preserves all entered data
- [ ] Re-submit by approved PSM with changed docs → status returns to `pending`
- [ ] Consents reflected in `ConsentRecord`

---

## 7. Implementation order (single PR, after sign-off)

1. Make canonical `psm-intake-v1.ts` the **only** schema; API imports it (fix #1, #2).
2. Build shared **chips + tag input** component (fix #3); wire into practice step.
3. Standardize per-step banner + inline validation (section 4).
4. Resolve consents (fix #4) on Revisión.
5. Ensure Revisión + `buildPsmApiPayload` use the same helpers (no drift).
6. Run acceptance checklist 10× with reset script.

---

## 8. Decisions — LOCKED

1. **Custom values** for enfoque/especialización: **store exactly as typed** ("EMDR"). No slug normalization in v1.
2. **Open field visibility:** **always visible** tag input. No "Agregar otro…" toggle, no "Otro" chip.
3. **Consents:** **explicit checkboxes on Revisión** before submit. Submit disabled until terms + privacy are checked.
4. **Revisión edit-back:** **add "Editar"** per section that jumps to the matching PSM sub-step.
