# Psychat context routing — RootRouter & enclaves (slice 5)

## Problem

Venice TEE/E2EE protects **inference**. Long **working context** (what gets selected into the prompt) is a separate trust boundary (`store.json` in RootRouter).

## Architecture

```text
Browser (Psychat)
  ├─ hub_default → POST /api/chat (RAG optional, thread in browser)
  └─ local_rootrouter → POST http://127.0.0.1:8787/v1/chat/completions
         └─ RootRouter (local store.json, plaintext in proxy process)
               └─ POST /api/chat/rootrouter-upstream (Bearer bridge JWT, credit, no RAG)
                     └─ Venice/OpenAI via lib/ai-client
```

Session / always-on enclave: same diagram with proxy URL on **Phala** + attestation gate (phase 2). See [psychat-enclave-phala-decision.md](./psychat-enclave-phala-decision.md).

## Code map

| Area | Path |
|------|------|
| Settings (localStorage) | `lib/psychat-context/settings.ts` |
| Send via proxy | `lib/psychat-context/send-local-proxy.ts` |
| Bridge JWT | `lib/auth/rootrouter-bridge-token.ts` |
| Upstream route | `app/api/chat/rootrouter-upstream/route.ts` |
| Modal UX | `components/psychat/PsychatContextModal.tsx` |
| Psychat wiring | `app/psychat/page.tsx`, `components/ui/animated-ai-chat.tsx` |

## User guide

[psychat-memoria-contexto-es.md](../guides/psychat-memoria-contexto-es.md) · UI page `/psychat/memoria-contexto`

## Phased delivery

1. **SHIPPED (code):** local RootRouter path + modal + upstream + docs.
2. **Beta:** `NEXT_PUBLIC_PSYCHAT_SESSION_ENCLAVE_URL` + attestation route.
3. **Future:** always-on enclave SKU.

## Non-goals

Indexing bitácora into RootRouter on Motus servers; replacing wallet export; Cursor/Codex base_url integration.
