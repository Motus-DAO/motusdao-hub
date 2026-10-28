# Psychat context enclave — vendor decision (Phala)

> Status: **LOCKED** · 28 Oct 2026 · Parent: [chat-data-slice-5-rootrouter-enclave.md](../../specs/chat-data-slice-5-rootrouter-enclave.md)

## Decision

Motus will host **RootRouter proxy** (OpenAI-compatible context engine + `store.json` working memory) in **Phala confidential workers** for Psychat **fase 2** (session enclave) and **fase 3** (always-on), once attestation is wired in the Hub.

**Not chosen** as primary enclave host for this product path: **NEAR Protocol** (as compute/TEE layer), generic VPS (`vps-motusdao`, `vps-brahma`), or encrypting local `store.json` with wallet keys (deferred).

## Why Phala fits this repo

| Requirement | Phala | NEAR (typical AI stack) |
|-------------|-------|-------------------------|
| Run **custom Docker** / Node `@rootrouter/proxy` | Primary product (confidential VM / workers) | Agent/inference paths; less standard for stateful HTTP proxy + mutable store |
| **Attestation** of published RootRouter build | Core to Phala Cloud / DCAP flow | Possible but not the default integration for “our proxy + our file” |
| Keep **Celo + SIWE + Hub credit** on Vercel | Enclave is only `base_url` + attestation gate | Tends to pull identity/payments into NEAR rail |
| **Session ephemeral** (fase 2) billing | Worker spin-up / tear-down maps cleanly | Extra chain/product surface |
| Aligns with SDD-chat-data §7 | “Room on server host cannot read memory” | Same only if NEAR TEE product matches custom image — higher integration cost |

## What Phala does **not** replace

- **Venice TEE / E2EE** — inference per message (Psychat privacy toggle).
- **Psychat archive / bitácora** — wallet ciphertext in Postgres; separate unlock purposes.
- **Fase 1 local RootRouter** — remains default power-user path (`127.0.0.1:8787`).

## Architecture (target)

```text
Browser Psychat
  → attestation OK? (Hub GET /api/psychat/enclave-attestation)
  → HTTPS to Phala worker URL (NEXT_PUBLIC_PSYCHAT_SESSION_ENCLAVE_URL)
       └─ RootRouter proxy in TEE (store.json in enclave memory/disk)
  → upstream Hub /v1/chat/completions (bridge JWT, credit, Venice)
```

## Non-goals (this decision)

- No NEAR wallet required for Hub users.
- No Jitsi / therapy video on Phala workers.
- No claim “HIPAA certified” from TEE alone.
- No encryption-at-rest of local `store.json` on user laptop (unchanged).

## Implementation follow-ups (ops, not LOCKED here)

1. Publish RootRouter proxy image + **expected measurement** in runbook.
2. Replace attestation **mock** in `app/api/psychat/enclave-attestation/route.ts`.
3. Set Vercel env for session URL; staging with `PSYCHAT_ENCLAVE_ATTESTATION_MOCK_OK` only.
4. Commercial pricing for fase 2 vs fase 3 (always-on).

## References

- [SDD-chat-data.md §6–7](../specs/SDD-chat-data.md)
- [psychat-rootrouter-context.md](./psychat-rootrouter-context.md)
- [psychat-memoria-contexto-es.md](../guides/psychat-memoria-contexto-es.md)
