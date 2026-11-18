# Motus Hub — Public messaging playbook

> **Status:** ACTIVE · Owner: product + marketing · Created: 2026-11-18  
> **Use:** website refresh, paid/organic campaigns, PSM acquisition, patient onboarding copy.  
> **Evidence dashboard:** [specs/STATUS.md](../../specs/STATUS.md) (what is shipped).  
> **Legal floor:** [docs/compliance/](../compliance/README.md) (what we must not contradict).

---

## 0. Why this doc lives in `docs/brand/`, not `specs/`

| Location | Put here when… |
|----------|----------------|
| **`docs/brand/`** | Durable messaging, audiences, approved claims, copy blocks—feeds many surfaces, no single PR acceptance criteria. |
| **`specs/`** | A **slice** with DoD (e.g. [academy-marketing-funnel-sdd.md](../../specs/academy-marketing-funnel-sdd.md), landing page AC, A/B test scope). |
| **`docs/compliance/legal/`** | Binding privacy/terms language—marketing **must not** promise beyond this. |

When a campaign becomes a shippable slice (new landing, new funnel step), add a short spec in `specs/` and link back to this playbook.

---

## 1. North star (one sentence)

**Motus Hub es infraestructura de cuidado mental en México: terapia, herramientas privadas y formación profesional, sin monetizar tu vida interior como red social de anuncios.**

Longer brand frame (GitBook / manifesto register):

**Red viva de cuidado** — no marketplace del sufrimiento; coordinar personas, profesionales, educación y tecnología que **protege** antes que extrae.

---

## 2. Three layers (never mix in one paragraph)

Every public asset should pick **one primary layer**; stack only in this order on a full page: resistencia → prueba → gasolina.

### 2.1 Resistencia (why we exist)

**Promise:** oposición explícita al modelo “todo en claro en el servidor para optimizar engagement / ads”.

| Say | Do not say |
|-----|------------|
| Datos íntimos no son combustible de plataforma | “Nadie nunca ve nada” (falso para IA, pagos, resumen consentido) |
| Tú eliges qué compartes con tu profesional | “Cifrado end-to-end en todo Motus” (video, IA, resumen son otros modelos) |
| Profesional y paciente en entorno pensado para cuidado | “HIPAA certified”, “hospital digital”, “expediente NOM-004 automático” |

### 2.2 Prueba (what is real today)

Only claims backed by **shipped** product + [STATUS.md](../../specs/STATUS.md). Update this table when status changes.

| Capability | User-facing one-liner | Pointer |
|------------|----------------------|---------|
| Bitácora personal | Se cifra en tu navegador antes de guardarse; Motus no lee el contenido | Safety slice 7, CD6 key modes |
| Psychat | Apoyo conversacional con consentimiento; no es expediente clínico | Safety slice 2, aviso |
| Videoterapia | Salas en Jitsi privado (`jitsi.motusdao.org`), no fallback público | Safety slice 1 |
| Emparejamiento + sesión | Flujo usuario–PSM con match activo | Onboarding, terapia |
| Compartir con PSM | **Tú** redactas un resumen; revocable; no es volcado de bitácora | `/compartir-resumen`, slice 3 |
| Academia | Cursos, progreso, cobro Stripe en producto | STATUS Academia |
| Pagos | Wallet WaaP, .motus, terapia (SPEI / Connect en evolución) | README pagos |
| Identidad multilink | Varias wallets, una cuenta Hub | Identity specs |
| Compliance beta | Aviso, términos, cookies, subprocesadores públicos | Safety slice 6 |

### 2.3 Gasolina (what pays to keep the lights on)

**Frame:** servicios y formación financian la infra; **no** la venta del diario ni perfil psicométrico.

| Revenue line | Who pays | Public line |
|--------------|----------|-------------|
| Terapia / sesiones | Paciente (y flujo profesional) | Pagas por acceso a cuidado e infraestructura segura |
| Academia | PSM y usuarios en formación | Formación y comunidad profesional sostienen la red |
| Créditos IA (Psychat) | Usuario que usa IA | Pagas el uso del modelo, no cedes ownership del diario por default |
| Pagos on-chain / utilidad | Usuario en red Celo | Utilidad y pertenencia; no es el core del pitch clínico |

**Investor one-liner:** modelo de **servicios de salud mental + educación**; tesis política de **no extraer** datos íntimos como Facebook.

---

## 3. Positioning — what we are / are not

### We are

- Infraestructura para **cuidado mental** (MX primero), comunidad y profesionales.
- Plataforma con **privacidad por diseño** en espacios sensibles (bitácora, archivo opcional).
- Puente **paciente ↔ PSM** con consentimiento explícito donde el texto es legible al profesional.
- **AI–human hybrid** con humano en el centro (terapia humana, PSM verificado, IA acotada).

### We are not

- Marketplace tipo “compra cualquier psicólogo” sin continuidad ni ética de red.
- App de **expediente clínico** ni nota de evolución automática.
- Red social de **engagement** ni recomendación por predicción de comportamiento para anuncios.
- Cobertura universal planetaria, UHC on-chain, token MOT, yield Terra — **visión histórica**, no CTA 2026.
- Mercado de datos de salud mental **sin consentimiento** (training copy es opt-in aparte).

Align with [platform-harmonize.md](../../specs/platform-harmonize.md) taxonomy when naming product lines in copy.

---

## 4. Primary audiences

### 4.1 Paciente (usuario)

| Pain | Hook | Proof | CTA |
|------|------|-------|-----|
| “No sé por dónde empezar” | Nombra lo que vives; encuentra acompañamiento | Onboarding, Psychat exploración, matching | Crear cuenta / explorar |
| “No confío en que lean mi diario” | Bitácora cifrada en tu dispositivo | Safety 7, `/bitacora` copy | Conectar wallet, probar bitácora |
| “Necesito hablar con alguien” | Terapia en entorno privado | Jitsi privado, match | Agendar / terapia |

### 4.2 PSM (profesional)

| Pain | Hook | Proof | CTA |
|------|------|-------|-----|
| “Emprender sin infra” | Cobros, perfil, pacientes, formación en un Hub | Academia, Connect/CLABE según STATUS | Onboarding PSM |
| “Teleterapia insegura” | Video en servidor privado, no meet público | Runbook Jitsi | Verificar cuenta |
| “Contexto antes de sesión” | El paciente **comparte** resumen si quiere | `/compartir-resumen`, panel caseload | Completar perfil |

Funnel detail and course ladder: [academy-marketing-funnel-sdd.md](../../specs/academy-marketing-funnel-sdd.md).

### 4.3 Aliado / prensa / Web3

Lead with **resistencia + prueba** (custodia, multilink, Celo), not tokenomics. Defer DLN / data markets to “visión” footnote.

---

## 5. Approved copy blocks (Spanish)

### 5.1 Hero (web / landing)

**Headline:** Salud mental con infraestructura que no lee tu diario.

**Subhead:** Terapia, bitácora cifrada en tu navegador y herramientas con consentimiento claro. Formación y servicios profesionales sostienen la plataforma.

### 5.2 Three proof bullets

- **Bitácora:** cifrado en cliente; Motus guarda sobres, no tu texto en claro.
- **Terapia:** videoconsulta en sala privada; sin caer a hosts públicos.
- **Tu profesional:** comparte solo lo que tú redactas y autorizas (no export automático de bitácora).

### 5.3 Gasolina footnote (footer / FAQ)

MotusDAO cobra por sesiones, cursos de Academia y uso opcional de IA. No vendemos tu contenido íntimo a anunciantes.

### 5.4 “No somos” (short)

No somos expediente clínico automático, red social de engagement ni consultorio certificado HIPAA.

---

## 6. Forbidden or deferred claims (2026 launch)

Do **not** use in hero, ads, or store listings without new legal review + engineering proof:

| Claim | Why |
|-------|-----|
| HIPAA certified / hospital digital | [regimen-tratamiento-datos.md](../compliance/regimen-tratamiento-datos.md) |
| Motus lee “nada” en absoluto | IA, resumen al PSM, metadatos, logs |
| E2E everything | Jitsi, IA upstream, pagos tienen otros modelos |
| Token MOT, Terra yield, UHC global on-chain | Whitepaper 2021 — vision only |
| Mercado de datos / ingreso universal activo | Roadmap; training copy es opt-in acotado |
| “Algoritmo que predice comportamiento” estilo Meta | Contradice posicionamiento |
| XX Network / mixnet shipped en Hub | Not in product |

Marketing for **psicólogos en México:** avoid “licencia”, “acreditación clínica oficial”, “credencial COFEPRIS” unless legally substantiated (see Knowledge `claims_guardrails` if imported).

---

## 7. Campaign checklist (before spend)

1. [ ] Every bullet maps to a row in §2.2 or is labeled “próximamente”.
2. [ ] Privacy/terms links visible; subprocesadores linked for IA/video/pagos.
3. [ ] Audience (§4) explicit in brief; one primary CTA.
4. [ ] No §6 forbidden claims.
5. [ ] PSM ads: verification / beta estado honesto.
6. [ ] After copy change to `/privacy` or `/terms`, legal pass before ads.

---

## 8. Relationship to canon elsewhere

| Source | Role |
|--------|------|
| MotusDAO Knowledge MCP — namespace `brand` | GitBook público, manifiesto red viva |
| Whitepaper 2021 (PDF / extract fuera del repo) | Visión histórica (E8, UHC, tokenomics)—**no** copy de lanzamiento |
| Whitepaper técnico AI–human hybrid v0.2 (Knowledge) | UMI y mercados de datos = largo plazo |
| This playbook | **Operational** bridge: web + ads + what ships in `motusdao-hub` |
| MCP mirror | `MCP-MotusDAO/content/brand/public-messaging-playbook.md` — run MCP ingest after edits |

When GitBook and this playbook disagree on **product facts**, STATUS + this doc win for the Hub app.

---

## 9. Next copy work (suggested, not committed)

- Homepage sections mapped 1:1 to §5 blocks.
- Patient vs PSM landing variants (§4).
- Academy Génesis: conversion without overclaiming clinical device ([academy-marketing-funnel-sdd.md](../../specs/academy-marketing-funnel-sdd.md)).
- Optional slice: “borrador desde bitácora” en `/compartir-resumen` — spec when prioritized.

---

## 10. Changelog

| Date | Change |
|------|--------|
| 2026-11-18 | Initial playbook — resistencia / prueba / gasolina, audiences, guardrails |