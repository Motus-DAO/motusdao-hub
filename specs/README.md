# Loop + QA + SDD Workflow

> One source of truth for how agents (and humans) ship features in this repo:
> small slices, spec-first, independently verified, looped until the
> Definition of Done is met. Current state lives in [STATUS.md](./STATUS.md).
>
> Built to match existing conventions (see `specs/psm-intake-v1.md`).

This folder is the **control system**. The Cursor hooks in `.cursor/hooks.json`
are the **engine** that loops the agent until a spec's exit conditions pass.

---

## The model in one picture

```text
SDD (spec)  ──defines──▶  acceptance criteria + exit conditions
   │                                   │
   ▼                                   ▼
Builder agent ──implements──▶  QA gate (lint, typecheck, tests, build, criteria)
   ▲                                   │
   └──────── loop (stop hook) ◀────────┘
        re-prompt with failures until green OR loop_limit hit
```

- **SDD** keeps the agent from drifting: scope, non-goals, acceptance criteria, exit conditions.
- **Loop** is the repeating Builder → QA → fix cycle.
- **QA** is an independent check (a checker subagent and/or the deterministic gate), never self-approval.

---

## Roles per loop

| Role | Who | Responsibility |
|------|-----|----------------|
| **Builder** | main agent / `generalPurpose` subagent | Implements one slice from the active spec. |
| **Checker / QA** | `explore` (read-only) subagent + the gate script | Validates independently against acceptance criteria. Never self-grades. |
| **Loop driver** | `stop` hook (`.cursor/hooks/qa-loop.mjs`) | Runs the gate; re-prompts the Builder with failures or stops when green. |

---

## Loop unit (keep it tiny)

One **user-visible behavior** per loop run. Examples:

- "Admin can create a course with title + slug and see it persisted."
- "Lesson progress survives a page refresh."

If a slice needs more than ~1 day or touches many systems, split it into more specs.

---

## Definition of Done (DoD)

A slice is **done** only when ALL of these hold. This is the checklist the QA gate
and the checker subagent verify:

- [ ] Every acceptance criterion in the spec maps to at least one check or test.
- [ ] `npm run lint` passes (no new errors).
- [ ] `npx tsc --noEmit` passes (no new type errors).
- [ ] `npm test` passes (all discovered `*.test.ts(x)` files; add a test for new logic).
- [ ] `npm run build` passes when the slice touches the app.
- [ ] At least one **negative-path** check for new logic (invalid input is rejected).
- [ ] Prisma schema changes include a migration + a rollback note.
- [ ] Evidence attached to the PR: changed-file list + gate output (+ screenshot for UI).
- [ ] No open critical QA/Bugbot findings.
- [ ] Non-goals in the spec were respected (no scope creep).

> "Tests green" alone is **not** done. Each acceptance criterion is verified individually.

---

## How to run a loop

1. **Write/choose a spec.** Copy `_TEMPLATE.md` to `specs/<feature>.md` and fill it in.
   Lock the open decisions before coding.
2. **Point the loop at it.** Set the active spec and enable the loop for the session:

   ```bash
   export MOTUS_QA_LOOP=1
   export MOTUS_ACTIVE_SPEC=specs/academy-admin-courses.md
   ```

   (The hook is a no-op unless `MOTUS_QA_LOOP=1`, so normal sessions are unaffected.)
3. **Tell the agent to build the slice** named in the spec.
4. The **stop hook** runs the QA gate after each turn:
   - **Fail** → it returns a `followup_message` with the failures; the agent keeps fixing.
   - **Pass** → it stays quiet; the loop ends.
   - `loop_limit` caps runaway loops (default `5` in `hooks.json`); on cap, it escalates to a human.
5. **Independent QA pass.** Run a read-only checker subagent against the acceptance
   checklist before opening/merging the PR.

To stop early: `unset MOTUS_QA_LOOP`.

---

## Tests and CI

- `npm test` runs [`scripts/run-tests.mjs`](../scripts/run-tests.mjs), which discovers every
  `*.test.ts` / `*.test.tsx` under `lib/`, `components/`, `app/`, and `scripts/`.
- There is no hard-coded file list: adding a test file wires it into the gate automatically.
- CI (`.github/workflows/ci.yml`) runs: lint → typecheck → `npm test` → `prisma validate` → build.
- The build does not need a live database: the sitemap degrades to static routes and the
  therapist listing pages render on demand.

---

## Do we need a harness? (decision)

**Not yet.** Native Cursor (stop/subagentStop hooks + subagents) plus `node:test` is enough while
work is single-repo and PR-centric. Reach for an external harness only when you need:

- cross-repo or multi-service orchestration,
- unattended long-running runs with retries/SLAs,
- centralized audit/replay/metrics across many runs,
- a regression **eval set** for the top critical flows (signup, enrollment, checkout, playback, progress).

Rule of thumb: **if failure impact > cost of setup**, add the harness. Until then, loop locally.

---

## Specs index

Grouped by track. Status per slice lives in the spec header and in [STATUS.md](./STATUS.md);
this index only tells you where each spec is.

| Track | Specs |
|-------|-------|
| **Platform / workflow** | [platform-harmonize](./platform-harmonize.md) · [STATUS](./STATUS.md) · [auth-provider-agnostic](./auth-provider-agnostic.md) · [_TEMPLATE](./_TEMPLATE.md) |
| **Academy** | [platform-decision](./academy-platform-decision.md) (LOCKED) · [admin-courses](./academy-admin-courses.md) · [admin-lessons](./academy-admin-lessons.md) · [public-catalog](./academy-public-catalog.md) · [learner-player](./academy-learner-player.md) · [lesson-progress](./academy-lesson-progress.md) · [media-upload](./academy-media-upload.md) · [marketing-funnel-sdd](./academy-marketing-funnel-sdd.md) |
| **PSM / therapy** | [psm-intake-v1](./psm-intake-v1.md) · [psm-public-profile](./psm-public-profile.md) · [psm-availability-calendar-sync](./psm-availability-calendar-sync.md) · [therapy-payments-clabe-connect](./therapy-payments-clabe-connect.md) |
| **Safety (Oct 2026)** | [slice 1 — therapy rooms](./safety-slice-1-therapy-rooms.md) · [slice 2 — Psychat session/consent](./safety-slice-2-psychat.md) · [slice 3 — onboarding wallet](./safety-slice-3-onboarding-wallet.md) · [slice 4 — inbox/platform keys](./safety-slice-4-inbox-platform-keys.md) · [slice 5 — admin session/audit](./safety-slice-5-admin-session-audit.md) · [slice 6 — program gap](./safety-slice-6-program-gap.md) · [slice 7 — bitácora ciphertext](./safety-slice-7-bitacora-ciphertext.md) |
| **Chat data / portability** | [roadmap](./chat-data-roadmap.md) · [slice 1 — bitácora export](./chat-data-slice-1-bitacora-export.md) · [slice 2 — Psychat archive](./chat-data-slice-2-psychat-archive-export.md) · [slice 3 — FHIR summary](./chat-data-slice-3-consented-summary-fhir.md) · [slice 4 — training copy](./chat-data-slice-4-training-copy-consent.md) · [slice 5 — RootRouter/enclave](./chat-data-slice-5-rootrouter-enclave.md) |
| **Psychat** | [usuario — exploración](./psychat-usuario-modo-exploracion.md) · [PSM lock-in](./psychat-psm-supervisor-lockin.md) · [PSM slice 1](./psychat-psm-slice-1-venice-routing.md) · [PSM slice 2](./psychat-psm-slice-2-ui-truth.md) · [PSM slice 3](./psychat-psm-slice-3-usuario-routing-e.md) |
| **Ramps / payments** | [Ripio widget](./ripio-ramps-widget.md) · [Ripio wFiat](./ripio-wfiat-pagos.md) |
| **Legacy** | [motusai-chat-ui](./motusai-chat-ui.md) — MotusAI era; `MotusAI` is now Psychat |

Plans (not slices): [SDD-safety-plan](../docs/specs/SDD-safety-plan.md) ·
[SDD-chat-data](../docs/specs/SDD-chat-data.md).

---

## Files in this system

| File | Purpose |
|------|---------|
| `specs/STATUS.md` | **Only** status dashboard: shipped / in flight / next. |
| `specs/platform-harmonize.md` | Platform truth: taxonomy, phases, decisions. |
| `specs/_TEMPLATE.md` | SDD spec template. Copy per feature. |
| `specs/*.md` | Slice specs (see index above). |
| `scripts/run-tests.mjs` | Discovers and runs every `*.test.ts(x)`. |
| `.cursor/hooks.json` + `.cursor/hooks/qa-loop.mjs` | Stop-hook loop + deterministic gate. |
| `.github/workflows/ci.yml` | CI: lint, typecheck, test, Prisma validate, build. |
| `AGENTS.md` | Agent entry: read order + gate. |
| `docs/specs/SDD-safety-plan.md` | Clinical-safety plan (locked). |
| `docs/specs/SDD-chat-data.md` | Portability/chat-data plan (locked). |
| `docs/architecture/psychat-supervisor-product.md` | Psychat PSM product contract. |

---

## Maintaining this index

- When you add or rename a spec, add it to the right track above.
- When a slice ships, update its header **and** [STATUS.md](./STATUS.md).
- Do not duplicate status tables here or in `platform-harmonize.md`.
