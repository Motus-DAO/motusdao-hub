# Loop + QA + SDD Workflow

> One source of truth for how agents (and humans) ship features in this repo:
> small slices, spec-first, independently verified, looped until the
> Definition of Done is met. Built to match existing conventions
> (see `docs/psm-intake-v1-spec.md`).

This folder is the **control system**. The Cursor hooks in `.cursor/hooks.json`
are the **engine** that loops the agent until a spec's exit conditions pass.

---

## The model in one picture

```
SDD (spec)  ──defines──▶  acceptance criteria + exit conditions
   │                                   │
   ▼                                   ▼
Builder agent ──implements──▶  QA gate (lint, typecheck, tests, criteria)
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
- [ ] Tests for the changed paths pass (once a test runner exists in the repo).
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

## Do we need a harness? (decision)

**Not yet.** Native Cursor (stop/subagentStop hooks + subagents) is enough while work is:
single-repo, PR-centric, with deterministic local checks.

Reach for an external harness (CI orchestrator / eval harness) only when you need:

- cross-repo or multi-service orchestration,
- unattended long-running runs with retries/SLAs,
- centralized audit/replay/metrics across many runs,
- a regression **eval set** for the top critical flows (signup, enrollment, checkout, playback, progress).

Rule of thumb: **if failure impact > cost of setup**, add the harness. Until then, loop locally.

---

## Files in this system

| File | Purpose |
|------|---------|
| `specs/_TEMPLATE.md` | SDD spec template. Copy per feature. |
| `specs/academy-platform-decision.md` | **LOCKED** platform decision: EduPath-LMS as primary OSS reference. |
| `specs/academy-admin-courses.md` | Slice 1: admin course CRUD for the Academy. |
| `specs/academy-admin-lessons.md` | Slice 2: admin module + lesson editor (depends on slice 1). |
| `specs/academy-public-catalog.md` | Slice 3: wire public `/academia` to DB (depends on slices 1–2). |
| `specs/academy-learner-player.md` | Slice 4: enrollment + lesson player (depends on slice 3). |
| `specs/academy-lesson-progress.md` | Slice 5: per-lesson progress in DB (replaces localStorage). |
| `specs/academy-media-upload.md` | Slice 6: lesson video/PDF upload via Supabase storage. |
| `specs/motusai-chat-ui.md` | MotusAI cinematic chat + RootRouter investigate→QA loop. |
| `.cursor/hooks.json` | Registers the `stop` loop hook + `loop_limit`. |
| `.cursor/hooks/qa-loop.mjs` | Deterministic QA gate + loop decision (Node, no extra deps). |

---

## Rollout (suggested)

- **Week 1:** specs + DoD + lint/typecheck gate (this pack).
- **Week 2:** acceptance-criterion → test mapping; 1 negative test per slice.
- **Week 3:** read-only checker subagent in the loop + a UI smoke check.
- **Week 4:** small eval/regression set for the top 5 Academy journeys.
