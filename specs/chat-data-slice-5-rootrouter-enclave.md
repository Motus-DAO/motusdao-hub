# Chat-data slice 5 — RootRouter proxy + enclaves — Spec

> Status: **SHIPPED** @ `06b9523` (fase 1) · Fases 2–3 env-gated · Plan: [SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §6–7

## 1. Scope

### Fase 1 — Local RootRouter ✅

- UI modal `PsychatContextModal` + footer chip on Psychat.
- localStorage settings `motus-psychat-context-settings-v1`.
- Client send via `sendPsychatViaRootRouterProxy` → local proxy → upstream `/api/chat/rootrouter-upstream`.
- Bridge JWT 15m: `POST /api/psychat/proxy-bridge`.
- Docs: [psychat-memoria-contexto-es.md](../docs/guides/psychat-memoria-contexto-es.md), [psychat-rootrouter-context.md](../docs/architecture/psychat-rootrouter-context.md).
- Page: `/psychat/memoria-contexto`.

### Fase 2 — Session enclave 🔶

- `GET /api/psychat/enclave-attestation`, `NEXT_PUBLIC_PSYCHAT_SESSION_ENCLAVE_URL`.
- UI mode visible when env set; attestation mock via `PSYCHAT_ENCLAVE_ATTESTATION_MOCK_OK`.

### Fase 3 — Always-on ⏳

- `NEXT_PUBLIC_PSYCHAT_ALWAYS_ON_ENCLAVE=true` to expose mode (no infra in repo).

## 2. Acceptance criteria

1. **Given** hub_default, **when** user sends, **then** `POST /api/chat` (unchanged).
2. **Given** local_rootrouter + proxy down, **when** send, **then** clear error.
3. **Given** local_rootrouter + proxy up + upstream configured, **when** send, **then** completion via proxy path; Hub does not require full history in RAG for upstream route.
4. **Given** E2EE mode, **when** local_rootrouter selected, **then** UI warns; send uses E2EE path (not proxy).
5. **Given** modal, **when** user saves local mode without checkbox, **then** save disabled.
6. **Given** docs paths, **when** opened, **then** instructions match APIs table.

## 3. QA gate

- [x] `npx tsx --test lib/psychat-context/settings.test.ts`
- [x] `CI=true npm run build`
- [ ] Manual QA: RootRouter local + upstream token

## 4. Exit

Chat-data track complete after SHIPPED commit + roadmap row.
