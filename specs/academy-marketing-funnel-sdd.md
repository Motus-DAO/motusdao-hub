# Academia — Marketing Funnel & Course Audit — SDD

> Status: **ACTIVE · living memory** · Owner: CMO + CTO (this chat) · Created: 2026-09-16
>
> Purpose: persistent source of truth for the commercial audit of MotusDAO Academy —
> market context, course-by-course diagnosis, and a **modular slice backlog** so we
> can ship funnel/content/product changes one commit at a time without losing intent.
>
> **How to use this file**
> 1. This SDD is the **punto de referencia** for the marketing/sales chat.
> 2. Work advances **slice by slice** (sections §7–§8). Each slice may spawn a
>    child spec (`specs/academy-*.md`) when it becomes code-ready.
> 3. After each slice: update §9 Progress log + commit. Do not rewrite history of
>    locked decisions (§10) without an explicit decision note.
>
> Related: `specs/README.md` (SDD loop), `lib/academy/praxis-catalog.ts`,
> `prisma/data/locked/01-genesis.ts`, `prisma/data/praxis/*`,
> `prisma/data/praxis/internal/06-mapa-comercial-praxis.md`

---

## 0. North star

MotusDAO no vende solo “cursos”. Vende un **ecosistema** para psicólogos:

```text
Génesis (gratis) → Fundamentos ($20/mes) → Praxis ($15–40 + supervisión)
→ Validación / Pase → Portal clínico (operación)
```

El diferenciador vs marketplaces de CE (Adipa, etc.) y vs software de consultorio
(Luna, Medesk, etc.) es la combinación **formación clínica + herramientas Hub +
comunidad + ruta PSM**. El riesgo comercial actual es que **Génesis explica el
ecosistema como documentación** en vez de **demostrar valor y convertir**.

---

## 1. Scope of this SDD (program, not one PR)

This living SDD covers:

- Market context for psychologists (LATAM + digital practice + AI).
- Audit of every Academy block / Praxis product.
- Prioritized backlog of content, UX copy, and (later) product changes.
- Explicit non-goals so we do not boil the ocean.

It does **not** replace child implementation specs. When a slice is ready to code,
cut a focused spec from `_TEMPLATE.md` and point `MOTUS_ACTIVE_SPEC` at it.

---

## 2. Non-goals (program-level)

- No competing with Adipa on breadth of technique catalog (DBT/ADOS/WISC, etc.).
- No claiming license, certificación oficial, or automatic Portal access from course completion.
- No rewriting Benjamin’s clinical pedagogy without editorial owner review.
- No big-bang redesign of all five route blocks in one PR.
- No code changes until a slice is explicitly opened for implementation in this chat.

---

## 3. Market context (research snapshot · 2025–2026)

### 3.1 Demand signals

- LATAM continuing education and online learning are in sustained growth; buyers
  prefer **short, applicable** formats plus recognized credentials where available.
- Psychologists’ purchase triggers: *what can I do tomorrow in session?* and
  *who recognizes this?*

### 3.2 Where psychologists are going

1. **Telepsychology as default modality**, not a side offering.
2. **Practice stack:** calendar, clinical record, video, payments, consent, reminders.
3. **AI with brakes:** APA 2025 Practitioner Pulse — ~56% used AI (vs ~29% in 2024);
   ~92% report concerns (privacy, bias, hallucinations). Real use skews **admin**
   (drafting, summarization), not diagnosis.
4. **Skill-based CE + ethics** around digital tools and AI.
5. Competitors sell: CE catalogs (Adipa MX courses often ~MXN 445–790), clinic SaaS
   (expediente + video + IA), and loose supervision communities.

### 3.3 MotusDAO competitive frame

| Competitor type | They win on | We win on |
|---|---|---|
| CE marketplaces | Catalog breadth, certificates | Ecosystem + tools + PSM path |
| Clinic software | Ops UX, compliance packaging | Clinical formation + community + ethics framing |
| One-off courses | Author brand / niche technique | Collection ladder + Hub product surface |

**Pricing note:** Praxis at USD 15 is competitive vs regional short courses; collection
ladder to USD 100 + supervisión USD 50 is a sound LTV design (see internal map).

---

## 4. Catalog inventory (source of truth)

| Product | Slug / id | Price | Commercial role |
|---|---|---|---|
| 01 — Génesis | `01-genesis` | Free | Top of funnel |
| 02 — Fundamentos | `02-fundamentos` | USD 20/mo · 120/yr | First paid conversion / ops membership |
| 03 — Praxis (container) | `03-praxis` | Catalog | Applied clinical formation |
| Escucha clínica y patrones | `escucha-clinica-patrones` | USD 15 | Short course · strong first SKU |
| Formulación de casos | `formulacion-casos-hipotesis` | USD 15 | Short course · supervision bridge |
| Razonamiento clínico y discurso | `razonamiento-clinico-discurso` | USD 15 | Short course · advanced bridge |
| Ética de la intervención | `etica-intervencion-conversacion` | USD 15 | Short course · ethics/AI-adjacent |
| Programa avanzado Benjamin | `programa-avanzado-logica-discurso-clinica` | USD 40 | Depth upsell |
| Supervisión clínica | `supervision-clinica` | USD 50 / session | Separate offer |
| 04 — Validación | `04-validacion` | Pase ~USD 50/mo | Gate to Portal |
| 05 — Portal clínico | `05-portal-clinico` | Post-pase | Operations product |

**Anchors**

- Catalog constants: `lib/academy/praxis-catalog.ts`
- Génesis locked seed: `prisma/data/locked/01-genesis.ts`
- Praxis MD corpus: `prisma/data/praxis/01-…05-*.md`, `00-bloque-03-praxis.md`
- Internal commercial map: `prisma/data/praxis/internal/06-mapa-comercial-praxis.md`
- Route order: `lib/academy/route-blocks.ts`

---

## 5. Course-by-course diagnosis

### 5.1 01 — Génesis ⚠ PRIORITY #1

**Current shape:** 2 modules · 4 lessons (~26 min). Identify → map → manifesto → tools list.

**Strengths**

- Clear ICP segments (new grad / offline→digital / messy online).
- Strong free entry (“sin costo, sin compromiso”).
- Manifesto has brand spine.

**Commercial failures (confirmed)**

1. Does **not** behave as a sales funnel; behaves as a wiki.
2. Opens / reinforces exits to long GitBook docs too early (course description,
   map lesson, full manifesto link).
3. Tools are presented as an **inventory**, not a **60-second value demo**.
4. CTAs are diluted: free profile + Fundamentos + Telegram later + accelerated pass + docs.
5. Map copy misdescribes Praxis (sounds like Portal: tools / supervision / virtual office).
6. Brand paradox: manifesto says there are no funnels; business needs an honest funnel.

**Direction (locked intent — implementation later)**

- Shorter, more concise.
- One dominant CTA (likely Fundamentos **or** complete profile → Fundamentos).
- Full documentation lives at the **end** or a separate “Documentación / Leer más” section —
  not as the opening move.
- Tools introduced by **outcome**, not feature dump.

### 5.2 02 — Fundamentos

**Sells:** digital practice operating system (frame, ethics, profile, membership).

**Market fit:** high — matches “online but messy” pain and stack demand.

**Risk:** if Génesis fails to convert emotionally, Fundamentos feels like “another course”
instead of “my practice OS”.

**Direction:** sell as **membership / operation**, not only content. Competes with SaaS
positioning as much as with CE.

### 5.3 Escucha clínica y patrones (USD 15)

**Promise:** observe vs infer; patterns; therapeutic relationship. ~60–75 min.

**Fit:** cross-orientation → best **first Praxis SKU**.

**Risk:** abstract copy; must anchor to pain (“I interpret too fast / I get lost in session”).

**Upsell:** → Formulación.

### 5.4 Formulación de casos (USD 15)

**Promise:** scattered notes → revisable hypotheses ready for supervision.

**Fit:** very high professional purchase intent.

**Angle:** “prepárate para supervisión en 30 minutos”.

**Bridge:** Academia → Supervisión USD 50.

### 5.5 Razonamiento clínico y discurso (USD 15)

**Promise:** absolutes, exceptions, square of opposition, logic↔clinic limits.

**Fit:** more intellectual niche; great 2nd/3rd purchase.

**Risk:** reads as philosophy unless sold as *clinical questioning tool*.

**Bridge:** → Programa avanzado USD 40.

### 5.6 Ética de la intervención (USD 15)

**Promise:** every intervention changes the conversation; open↔directive continuum; rubric.

**Fit 2025–26:** excellent (ethics, language, power; adjacent to AI/privacy conversation).

**Angle:** “deja de improvisar la frase; evalúa el efecto”.

**Bridge:** → Supervisión for real cases.

### 5.7 Programa avanzado Benjamin (USD 40)

**Promise:** formal logic + Lacan + author model. Explicit niche; honest “para quién / no”.

**Role:** LTV / brand depth, not top-of-funnel volume.

**Risk:** purchase without prerequisites → frustration. UI should surface “para quién”.

### 5.8 Supervisión (USD 50)

Correctly separate from courses. Opportunity: bundle “curso + 1 supervisión” as mid-funnel offer.

### 5.9 Validación + Portal

Not mass-course SKUs — product gates. Marketing must never imply Praxis 5/5 = validated /
Portal access (already forbidden in Praxis copy).

---

## 6. Strategic conclusions (CMO + CTO)

1. **Génesis is the bottleneck.** Fix funnel/docs/tools presentation before catalog polish.
2. **Praxis pedagogy is strong.** Gap is sales discovery, sequencing, and landing copy.
3. **Price is an advantage** at USD 15 and collection ladder to USD 100.
4. **Win vs Adipa** on ecosystem, not technique catalog breadth.
5. **Win vs clinic SaaS** on clinical formation + community + ethics around tools.
6. Ship **modular + versioned**: one slice → one commit (or small PR) → update this SDD.

---

## 7. Modular slice backlog

Work top-down. Only one `in_progress` slice at a time unless explicitly parallelized.

| ID | Slice | Type | Status | Child spec (when cut) |
|---|---|---|---|---|
| **MF-01** | Génesis funnel rewrite — brief + content structure | Content / UX copy | `done` | `5b61046` · `academy-genesis.ts` |
| **MF-02** | Génesis: docs relocated to end / secondary section | Content | `done` | folded into MF-01 (módulo Documentación) |
| **MF-03** | Génesis: tools intro as value demo, not inventory | Content / Product | `done` | folded into MF-01 (3 outcomes) |
| **MF-04** | Génesis: single dominant CTA + secondary links | Content / UX | `done` | folded into MF-01 (Fundamentos primary) |
| **MF-05** | Fix route-map copy (Praxis ≠ Portal) | Content | `done` | folded into MF-01 mapa |
| **MF-01b** | Génesis: creadores Ruta PSM (Gerry + Benjamin + fotos) | Content | `done` (pending commit) | L1 + `public/academy/creators/` |
| **MF-01c** | Génesis: fotos producto (perfil, videochat, casos) | Content | `done` (pending commit) | L3 + `public/academy/product/` |
| **MF-01d** | Génesis: testimonios | Content | `done` (pending commit) | L3 “Qué ganas”, antes del CTA |
| **MF-01e** | Génesis: CTA reforzado + resultado comparable Fundamentos | Content | `done` (pending commit) | mapa + cierre L3 |
| **MF-01f** | Génesis: Validación + Portal en lenguaje claro | Content | `done` (pending commit) | mapa lesson |
| **MF-06** | Fundamentos positioning as membership/OS | Content / Pricing page | `queued` | TBD |
| **MF-07** | Praxis sales pages — Escucha (first SKU copy) | Content | `queued` | TBD |
| **MF-08** | Praxis sales pages — Formulación | Content | `queued` | TBD |
| **MF-09** | Praxis sales pages — Razonamiento | Content | `queued` | TBD |
| **MF-10** | Praxis sales pages — Ética | Content | `queued` | TBD |
| **MF-11** | Praxis sales pages — Programa avanzado + prerequisites UX | Content / UX | `queued` | TBD |
| **MF-12** | Supervisión offer + optional course bundle | Commercial | `queued` | TBD |
| **MF-13** | Collection 0/5→5/5 progression UX verification | Product | `queued` | may already partial in Praxis UI |
| **MF-14** | Metrics: define funnel events (view → complete Génesis → Fundamentos pay → Praxis buy) | Analytics | `queued` | TBD |

**Status legend:** `next` · `in_progress` · `blocked` · `done` · `queued` · `wontfix`

---

## 8. Slice playbook (how we advance in this chat)

For each slice:

1. Mark slice `in_progress` in §7 and add a Progress log line in §9.
2. Write the brief / acceptance criteria **in this SDD** (or cut a child spec if coding).
3. Implement only what the slice names (content seed, UI copy, or code).
4. Commit with a message scoped to the slice id (`MF-01: …`).
5. Mark `done`, note evidence (files, commit hash), pick next `next`.

**Active working agreement**

- Research / brief turns: **no code** until the slice is opened for implementation.
- This chat remains the working session until context fills; then hand off via §9 + git.

---

## 9. Progress log

| Date | Slice | Event | Notes |
|---|---|---|---|
| 2026-09-16 | — | SDD created | Market research + full catalog audit captured. No code changes. |
| 2026-09-16 | MF-01 | Seed rewrite + local seed | `academy-genesis.ts` conversion funnel; docs annex; Praxis map fixed; CTA Fundamentos. Commit `5b61046`. |
| 2026-09-17 | MF-01b | Creators in Genesis L1 | Gerry Alvarez + Benjamin Buzali photos + copy; Praxis authorship note (personality structures research). |
| 2026-09-17 | MF-01d | Testimonials in Genesis L3 | Five colleague quotes before Fundamentos CTA (no chapter timestamps in UI). |
| 2026-09-17 | MF-01c/e/f | Product shots + CTA + Validación/Portal | Hub screenshots; outcome box; CTAs to Fundamentos/perfil; human Validación/Portal copy. |

---

## 10. Decisions — LOCKED

1. **Génesis is the first implementation target** for funnel quality.
2. **Full documentation belongs at the end** (or a secondary docs section), not as the opening hyperlink field of Génesis.
3. **Génesis must be shorter and more concise**; depth lives in Fundamentos / GitBook / annex.
4. **Praxis clinical pedagogy stays**; we optimize commercial framing and sequencing, not rewrite the clinical method without owner review.
5. **No false equivalence:** completing Praxis ≠ Validación ≠ Portal access.
6. **Modular commits:** one slice intent per commit / small PR when possible.
7. **This file (`specs/academy-marketing-funnel-sdd.md`) is the persistent memory** for the program until superseded.

---

## 11. Open questions (resolve before or during MF-01)

1. Dominant CTA after Génesis: **Fundamentos checkout** vs **complete professional profile** vs sequenced both?
2. Keep Manifesto as optional module 2, or collapse into a short brand paragraph + “Leer manifiesto”?
3. Tools lesson: in-app interactive tour vs screenshots + 3 outcome bullets?
4. Primary ICP for first 90 days of messaging: egresados, digital-messy clinicians, or both with branched copy?
5. Do we need Spanish-LATAM pricing localization (MXN display) for Praxis cards?

---

## 12. MF-01 starter brief (ready for next turn)

**Goal:** turn Génesis into a conversion-oriented free block without losing brand honesty.

**Proposed lesson arc (draft — not implemented)**

1. **Esto es para ti** — ICP mirror + one-sentence MotusDAO + single CTA tease.
2. **El mapa en 60 segundos** — 5 blocks, correct Praxis definition, price only where needed (Fundamentos $20/mo).
3. **Qué ganas (herramientas)** — 3 outcomes max (e.g. perfil público, consultorio con link, MotusAI con límites), then “explorar en el Hub”.
4. **Tu siguiente paso** — one primary CTA + optional secondary.
5. **Documentación y manifiesto** (annex) — GitBook + manifiesto completo links live here only.

**Acceptance criteria (editorial — to harden when coding)**

1. No GitBook link in course `description` or lessons 1–3.
2. Praxis described as formación aplicada / catálogo, not as virtual office.
3. Exactly one primary CTA labeled consistently across last lesson + UI surfaces.
4. Docs/manifiesto reachable from annex only (or clearly labeled “opcional / profundizar”).
5. Word count / time-to-CTA materially shorter than current Module 2 depth-first path.

---

## 13. Suggested commit series (when we start shipping)

```text
docs(specs): add academy marketing funnel SDD (this file)
content(MF-01): rewrite Genesis funnel structure (seed/locked)
content(MF-01): relocate Genesis docs links to annex
fix(MF-05): correct Praxis description in Genesis map
…
```

First commit candidate when approved: **only this SDD file**.
