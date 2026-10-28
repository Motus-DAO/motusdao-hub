# Chat-data slice 5 — RootRouter proxy + enclaves — Spec

> Status: **SHIPPED** @ `06b9523` (fase 1 Hub UI + local proxy) · Fases 2–3 **Phala (LOCKED)** · Plan: [SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §6–7
>
> Vendor decision: [docs/architecture/psychat-enclave-phala-decision.md](../docs/architecture/psychat-enclave-phala-decision.md)

---

## 1. Scope

### Fase 1 — Local RootRouter ✅ (shipped)

- UI modal `PsychatContextModal` + footer chip on Psychat.
- localStorage settings `motus-psychat-context-settings-v1`.
- Client send via `sendPsychatViaRootRouterProxy` → local proxy → upstream `/api/chat/rootrouter-upstream`.
- Bridge JWT 15m: `POST /api/psychat/proxy-bridge`.
- Docs: [psychat-memoria-contexto-es.md](../docs/guides/psychat-memoria-contexto-es.md), [psychat-rootrouter-context.md](../docs/architecture/psychat-rootrouter-context.md).
- Page: `/psychat/memoria-contexto`.
- **`store.json` on user disk, plaintext** while proxy runs — acceptable for fase 1; no wallet encryption of store (deferred).

### Fase 2 — Session enclave on Phala 🔶 (ops + attestation)

- Deploy **`@rootrouter/proxy`** (published Motus/RootRouter image) on **Phala confidential worker** per session or short-lived lease.
- Hub env: `NEXT_PUBLIC_PSYCHAT_SESSION_ENCLAVE_URL` → Phala HTTPS endpoint.
- Hub gate: `GET /api/psychat/enclave-attestation?url=` verifies **measurement** against published build (mock only in dev: `PSYCHAT_ENCLAVE_ATTESTATION_MOCK_OK`).
- UI mode `session_enclave` visible when env set (`GET /api/psychat/context-capabilities`).
- **Out of repo today:** Phala deployment pipeline, real attestation verifier, billing for worker lifetime.

### Fase 3 — Always-on enclave on Phala ⏳

- Same stack as fase 2, **persistent** Phala worker (higher cost SKU).
- Hub env: `NEXT_PUBLIC_PSYCHAT_ALWAYS_ON_ENCLAVE=true` exposes mode when URL + attestation path exist.
- Durable user copy remains **wallet export / Psychat archive**, not Phala disk alone.

---

## 2. Acceptance criteria (fase 1 — shipped)

1. **Given** hub_default, **when** user sends, **then** `POST /api/chat` (unchanged).
2. **Given** local_rootrouter + proxy down, **when** send, **then** clear error.
3. **Given** local_rootrouter + proxy up + upstream configured, **when** send, **then** completion via proxy path; Hub does not require full history in RAG for upstream route.
4. **Given** E2EE mode, **when** local_rootrouter selected, **then** UI warns; send uses E2EE path (not proxy).
5. **Given** modal, **when** user saves local mode without checkbox, **then** save disabled.
6. **Given** docs paths, **when** opened, **then** instructions match APIs table.

### Fase 2–3 (future — Phala)

7. **Given** production env without mock, **when** attestation fails, **then** Psychat does not send context to enclave URL.
8. **Given** attestation OK + fase 2 worker, **when** user chats, **then** context accumulates in enclave RootRouter store, upstream still Hub `/v1/chat/completions`.
9. **Given** fase 2 worker destroyed, **when** session ends, **then** enclave store is gone; user may still use Psychat archive export if enabled.

---

## 3. QA gate

- [x] `npx tsx --test lib/psychat-context/settings.test.ts`
- [x] `CI=true npm run build`
- [ ] Manual QA: RootRouter local + upstream token (prod: `app.motusdao.org`; puerto 8790 si 8787 ocupado)
- [ ] Phala staging: worker URL + attestation (blocked on ops)

---

## 4. Exit (fase 1)

Chat-data **Hub code path** for slice 5 fase 1 is complete. Roadmap row remains **SHIPPED** with Phala noted for enclave phases.

---

## 5. Decisions — LOCKED (Phala)

1. **Vendor for enclave hosting:** **Phala Network** (confidential workers / CVM), not NEAR as the primary context-enclave platform.
2. **Why Phala:** custom **Node RootRouter proxy** + mutable **`store.json`** + **OpenAI-compatible HTTP** + **attestation of container measurement** matches SDD §7; minimal change to Celo/SIWE/Hub billing (enclave = alternate `base_url` only).
3. **Why not NEAR (for this slice):** NEAR AI/agent stacks optimize chain-native inference and agents, not Motus’s “same proxy as local, but attestable”; would add second identity/payment rail without simplifying context TEE.
4. **Why not Motus VPS (`vps-motusdao`):** that host is **private Jitsi therapy** (safety slice 1); co-locating Psychat context proxy would expand blast radius and resource contention. Phala (or separate VPS **with** TEE) is intentional separation.
5. **Why not encrypt local `store.json` like Psychat archive:** same crypto pattern possible but **complicates** proxy churn and unlock UX; deferred — fase 1 stays plaintext on user disk; fase 2+ moves trust to **Phala TEE**, not disk AES on laptop.
6. **Inference TEE remains Venice:** Phala covers **long context / RootRouter**; Venice TEE/E2EE covers **model call** — two layers, both documented in help UI.
7. **Honest claims:** attestation must verify **published RootRouter build**; mock attestation **only** non-prod; no “nobody ever sees text” while slice still hits upstream model in plaintext for that request.

---

## 6. Non-goals (enclave track)

- NEAR wallet, NEAR paymaster, or on-chain session billing in slice 5.
- Indexing bitácora or Psychat ciphertext into RootRouter store (unchanged SDD).
- Replacing Vercel Hub deploy with self-host on Jitsi VPS.

---

## 7. Anchors

- `app/api/psychat/enclave-attestation/route.ts` — attestation gate (mock today)
- `app/api/psychat/context-capabilities/route.ts` — env flags
- `components/psychat/PsychatContextModal.tsx`, `lib/psychat-context/*`
- Ops doc: [psychat-enclave-phala-decision.md](../docs/architecture/psychat-enclave-phala-decision.md)
