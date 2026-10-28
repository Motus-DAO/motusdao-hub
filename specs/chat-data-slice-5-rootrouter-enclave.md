# Chat-data slice 5 — RootRouter proxy + enclaves — Spec

> Status: **NOT STARTED** · Blocked on: slices 1–4 product paths stable.
>
> Plan: [SDD-chat-data.md](../docs/specs/SDD-chat-data.md) §6–8 · Roadmap: [chat-data-roadmap.md](./chat-data-roadmap.md).

Phased AC (one spec, three phases):

1. **Local proxy** — Psychat `base_url` → person’s RootRouter; Motus does not index `store.json`.
2. **Session enclave** — attestation-gated room; key wiped when session ends.
3. **Always-on enclave** — optional; higher cost.

Non-goals: encrypting bitácora into RootRouter; Cursor/Codex base URL (reference only).

Acceptance detail — to write when slice 5 starts.
