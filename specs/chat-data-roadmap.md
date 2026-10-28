# Chat-data roadmap — grouped slices

> Parent plan: [docs/specs/SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §9  
> Safety plan slices 1–7 are **done**. This file maps the remaining **7 product steps** into **5 audit-friendly specs** without changing **dependency order**.

## Why group at all?

| Keep separate | OK to merge in one spec |
|---------------|-------------------------|
| Different **legal promise** (train vs export vs FHIR) | Same **engineering pattern** (wallet export package) |
| Different **threat model** (Motus-readable vs ciphertext) | Same **ship cadence** (one QA gate, one commit series) |
| **Enclave** phases with different ops cost | Two enclave offers under one “TEE track” with two AC blocks |

For a future auditor: **order and non-goals stay as in SDD-chat-data**; each row below is still one `specs/chat-data-slice-*.md` with its own AC and SHIPPED commit. Merging is **documentation grouping**, not skipping steps.

## Mapping (your list → specs)

| Spec | SDD §9 step(s) | Delivers |
|------|----------------|----------|
| **1** — [chat-data-slice-1-bitacora-export.md](./chat-data-slice-1-bitacora-export.md) | Export bitácora | Published file format, key recipe doc, download button |
| **2** — [chat-data-slice-2-psychat-archive-export.md](./chat-data-slice-2-psychat-archive-export.md) | Psychat opt-in + export | **SHIPPED** — archive, sidebar, help (TEE/E2EE) |
| **3** — [chat-data-slice-3-consented-summary-fhir.md](./chat-data-slice-3-consented-summary-fhir.md) | FHIR second exit | **SHIPPED** — consented summary, DocumentReference, PSM panel |
| **4** — [chat-data-slice-4-training-copy-consent.md](./chat-data-slice-4-training-copy-consent.md) | Training yes + payment | **SHIPPED** — readable copy, consent, compensation recorded |
| **5** — [chat-data-slice-5-rootrouter-enclave.md](./chat-data-slice-5-rootrouter-enclave.md) | Proxy + session TEE + always-on | Fase 1 local RootRouter + modal; 2–3 env-gated |

**Do not reorder:** 1 before 2 (reuse format); 3 after 1–2; 4 after aviso (done); 5 last.

## Perfil / intake

Not in this track. Portability here = **bitácora** and optional **Psychat archive**, not `/api/profile` CSV.
