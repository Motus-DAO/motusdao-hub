# Safety slice 6 — Program gap (vendors + privacy notice) — Spec

> Status: **SHIPPED** on `main` at `fde8017` · Owner: product · 27 Oct 2026
>
> Purpose: published vendor disclosure and a Spanish privacy notice suitable for pre-revenue market entry in Mexico, with US-user disclaimers, without waiting for external legal counsel.
>
> Plan: [docs/specs/SDD-safety-plan.md](../docs/specs/SDD-safety-plan.md) slice 6.

---

## 1. Scope (what this slice delivers)

- **Inventario de encargados:** `docs/compliance/processors-inventory.md`, página pública `/subprocesadores`.
- **Aviso de privacidad integral** en español (LFPDPPP-oriented): fuente `docs/compliance/legal/aviso-de-privacidad-integral.md`, publicado en `/privacy`.
- **Términos de uso:** `/terms` (enlazados desde onboarding; antes 404).
- **Cookies:** `/cookies`.
- **Decisión de régimen pre-lanzamiento:** `docs/compliance/regimen-tratamiento-datos.md` (México primero; EE. UU. sin HIPAA badge).
- **Investigación de referencia:** `docs/compliance/privacy-notice-research-es.md`.
- **IPFS disclosure:** `docs/compliance/ipfs-storage-audit.md` + sección 8 del aviso.
- **Consent version:** `consentPolicyVersion` default `2026-10-27` en onboarding user/psm.
- **Hardening alineado al aviso:** `POST /api/profile/nft` requiere sesión y wallet coincidente.

## 2. Non-goals

- Slice 7 (Bitácora ciphertext) does not start here.
- No BAA HIPAA firmado con proveedores.
- No portal ARCO automatizado ni exportación masiva de datos (solicitud por correo).
- No consentimiento de entrenamiento de modelos (chat-data step futuro).

## 3. Acceptance criteria

1. **Given** a visitor, **when** they open `/privacy`, **then** they see the integral notice dated 2026-10-27 with sensitive-data, ARCO, subprocessors link, IPFS/NFT, and US disclaimer sections.
2. **Given** onboarding, **when** the user accepts terms and privacy, **then** links to `/terms` and `/privacy` resolve (not 404).
3. **Given** the compliance folder, **when** a reviewer opens it, **then** processor inventory and regime decision documents exist and match production integrations.
4. **Given** no session, **when** `POST /api/profile/nft` is called, **then** the response is 401.

## 4. QA gate

- [x] Public routes: `/privacy`, `/terms`, `/cookies`, `/subprocesadores` in `middleware.ts`.
- [x] Legal markdown renders via `lib/legal/load-legal-markdown.ts`.
- [x] `npx tsc --noEmit` passes.
- [x] Team acceptance recorded in `docs/compliance/regimen-tratamiento-datos.md`.

## 5. Exit conditions

Slice 6 program gap is closed for **beta / go-to-market**. Re-open when: (a) first paying US clinical flow, (b) training consent collection, or (c) razón social / domicilio fiscal formal — update aviso and subprocessors.

Next coding slice per safety plan: **slice 7 — Bitácora ciphertext** (`specs/safety-slice-7` TBD).

## 6. Decisions — LOCKED (pre-revenue)

1. Legal review deferred until revenue/traction; aviso is team-drafted from `privacy-notice-research-es.md` and processor audit.
2. Responsible party label **MotusDAO** + **contact@motusdao.org** until formal entity block is added.
3. IPFS is disclosed only for optional profile NFT metadata, not for clinical records.
