# Agent instructions — MotusDAO Hub

## Layer 0 — Feng Shui (where)

Before creating or moving files, read [FENG-SHUI.md](https://rootrouter.motusdao.org/FENG-SHUI.md) and follow it.

**Workspace (git root):** `/Users/main/MotusDAO-Hub-Psi/motusdao-hub`

## Layer 1 — RootRouter (what context)

Before broad repo exploration, use RootRouter MCP: `index_repo` → `select_context`.  
See `specs/HANDOFF.md` and [SKILL.md](https://rootrouter.motusdao.org/SKILL.md).

## Read order (mandatory)

1. `specs/platform-harmonize.md` — platform truth, taxonomy, phased plan
2. Active slice spec (`$MOTUS_ACTIVE_SPEC` or the spec named in the task)
3. `specs/README.md` — loop, QA, Definition of Done

## Placement rules

- Feature specs → `specs/`
- Durable architecture → `docs/architecture/`
- Ops / deploy → `docs/runbooks/`
- Historical debugging → `archive/` (never treat as source of truth)
- Do not create files at repo root except `README.md`, `AGENTS.md`, config manifests

## Restore point

Before structural changes, verify baseline tag exists: `harmonize-baseline-2026-07-01`  
Rollback: `git checkout harmonize-baseline-2026-07-01`
