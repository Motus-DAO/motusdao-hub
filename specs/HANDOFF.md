# Agent handoff — MotusDAO Hub

> Short, current handoff. Deep detail lives in [AGENTS.md](../AGENTS.md),
> [specs/platform-harmonize.md](./platform-harmonize.md),
> [specs/STATUS.md](./STATUS.md) and [specs/README.md](./README.md).

## Workspace

The git root of this checkout. Verify with:

```bash
pwd
git rev-parse --show-toplevel
ls specs/STATUS.md package.json prisma/schema.prisma
```

Do not hardcode another machine's path. UI copy and most user-facing docs are in Spanish; specs
mix Spanish and English — match the file you are editing.

## Read order (mandatory)

1. `AGENTS.md` — read order, gate, placement rules
2. `specs/platform-harmonize.md` — taxonomy and phases
3. `specs/STATUS.md` — shipped / in flight / next
4. Active slice spec (`$MOTUS_ACTIVE_SPEC` or the one named in the task)
5. `specs/README.md` — loop, QA, Definition of Done

`docs/specs/SDD-safety-plan.md` and `docs/specs/SDD-chat-data.md` are **LOCKED plans**, not status.
If they disagree with `STATUS.md`, `STATUS.md` wins for current state.

## Where we are (nov-2026)

- **Shipped in Oct 2026:** safety slices 1–7, chat-data slices 1–5, Academia with Stripe
  Checkout, SPEI/CLABE for therapy, beta legal pages, encrypted Bitácora.
- **Build was red** on `main`: 3 TypeScript errors plus DB-dependent prerender. Both are fixed
  in the 2026-11-06 refresh; `npm test` now runs every test file and CI runs it too.
- **In flight:** Psychat PSM slice 2 (block RootRouter proxy for PSM), Psychat slice 3
  (usuario exploración only on trigger), Stripe Connect (parked on a local branch), Phala
  enclave fases 2–3 (decision locked, not built).
- Full table: [specs/STATUS.md](./STATUS.md).

## Quality gate

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

CI runs lint → typecheck → `npm test` → `prisma validate` → build. The build must pass with the
CI placeholder `DATABASE_URL`; do not reintroduce a DB query in the prerender path.

## Current focus

1. **Psychat PSM slice 2:** in `components/ui/animated-ai-chat.tsx`, `runHubChat` still honors
   `useRootRouterProxy` for `role === 'psm'`. Gate it or warn clearly. Verify the 502 error path.
2. **Psychat PSM slice 3:** `resolvePsychatStructuredMode` returns `'exploracion'` for every
   `usuario` turn (`lib/psychat-prompt.ts`). Restore `wantsExploracionMode(userText)` so only a
   trigger produces JSON.
3. **Verify the deploy:** confirm production includes `4f04131` (PSM prose + report button) and
   this docs/build refresh.

## Psychat quick map

| Surface | Behavior |
|---------|----------|
| PSM conversation | `mode: supervisor_chat`, prose, Hub `/api/chat` |
| PSM report | Button sends `requestStructuredReport: true` → `supervisor_report` |
| Usuario exploration | JSON (`eco`, `pregunta`, `abierto`, `limite`, `puenteHumano`) on trigger — **currently every turn; fix in slice 3** |
| Providers | `AI_PROVIDER=openai` (default) or `venice` (TEE/E2EE); PSM uses Qwen supervisor TEE |
| RootRouter | Optional **local proxy** for context memory; **not** an editor MCP in this repo |

## Dev admin bypass (local only)

`.env.local`: `DEV_BYPASS_ADMIN_AUTH=1` — restart `npm run dev`. Dev only; remove before deploy.
It does not fake a learner session.

## Optional QA loop

```bash
export MOTUS_QA_LOOP=1
export MOTUS_ACTIVE_SPEC=specs/psychat-psm-slice-3-usuario-routing-e.md
```

Requires `.cursor/hooks.json` in Cursor. The hook is a no-op without `MOTUS_QA_LOOP=1`.

## Historical

This file used to carry a copy-paste prompt for Academy slice 4 (paid courses enrolled without
payment). That shipped with Stripe Checkout on 28-oct-2026 and the prompt is obsolete. Use
`git log -- specs/HANDOFF.md` and `archive/` for old handoffs; do not treat them as current.
