# Agent instructions — MotusDAO Hub

## Layer 0 — Feng Shui (where)

Before creating or moving files, read [FENG-SHUI.md](https://rootrouter.motusdao.org/FENG-SHUI.md) and follow it.

**Workspace (git root):** the root of this checkout. Verify with `pwd` or
`git rev-parse --show-toplevel`; do not hardcode another machine's path.

## Layer 1 — Current state (what ships)

Read [specs/STATUS.md](specs/STATUS.md) before proposing work. It is the only status dashboard
(shipped / in flight / next). Do not infer current state from a dated SDD snapshot or a README
that was written earlier.

## Read order (mandatory)

1. `specs/platform-harmonize.md` — platform truth, taxonomy, phased plan
2. `specs/STATUS.md` — current state and next work
3. Active slice spec (`$MOTUS_ACTIVE_SPEC` or the spec named in the task)
4. `specs/README.md` — loop, QA, Definition of Done

## Quality gate

Run before claiming a slice is done:

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

CI runs lint, typecheck, `npm test`, `prisma validate`, and build. Tests are discovered by
`scripts/run-tests.mjs`: add a `*.test.ts(x)` file and it runs, with no list to update.

## Placement rules

- Feature specs → `specs/`
- Durable architecture → `docs/architecture/`
- Ops / deploy → `docs/runbooks/`
- Historical debugging / dated snapshots → `archive/` (never treat as source of truth)
- Do not create files at repo root except `README.md`, `AGENTS.md`, config manifests

## RootRouter

RootRouter is **not** wired as an editor MCP in this repo (`.cursor/mcp.json` only has `shadcn`).
It is an optional **local proxy** for Psychat working memory (`lib/psychat-context/`,
`docs/architecture/psychat-rootrouter-context.md`). Do not require it to explore the repo.
If the MCP is added later, `.cursor/rules/rootrouter-mcp.mdc` is optional guidance, not a gate.

## Restore point

Before structural changes, verify baseline tag exists: `harmonize-baseline-2026-07-01`
Rollback: `git checkout harmonize-baseline-2026-07-01`
