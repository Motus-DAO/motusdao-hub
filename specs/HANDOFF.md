# Agent Handoff — MotusDAO Hub Academy

> Works in **Cursor Agents** (recommended) or Codex. Open the correct workspace first.

## Correct workspace path

```
/Users/main/MotusDAO-Hub-Psi/motusdao-hub
```

Verify:

```bash
ls specs/academy-learner-player.md package.json prisma/schema.prisma
```

**Not** `/Users/main/Documents/Coding MotusDAO`.

---

## Cursor Agents + RootRouter (token savings)

RootRouter MCP is wired in `.cursor/mcp.json`. **Reload Cursor** (or toggle MCP in Settings) after pulling.

Tools: `index_repo`, `record_context`, `select_context`, `stats`.

### Required workflow (every slice)

1. **`index_repo`** — path: `/Users/main/MotusDAO-Hub-Psi/motusdao-hub` (re-index if repo changed a lot).
2. **`select_context`** — query = active spec title + acceptance criteria; `tokenBudget` 4000.
3. **Read only** the returned chunks + the active spec file (do not `@` whole folders).
4. Implement; use `Read`/`Grep` only for files not covered by selection.
5. **`stats`** — report tokens saved at end of task.

If RootRouter MCP is unavailable: proceed with spec + targeted `Grep`/`Read` only (no full-repo exploration).

---

## Read order (mandatory)

1. `specs/academy-platform-decision.md` — LOCKED
2. Active slice spec (e.g. `specs/academy-learner-player.md`)
3. `specs/README.md` — loop + QA + DoD

---

## Slice 4 — Cursor Agents prompt (copy-paste)

```
Workspace: /Users/main/MotusDAO-Hub-Psi/motusdao-hub
Verify: ls specs/academy-learner-player.md components/academy/PublicCourseDetail.tsx app/api/enrollments/route.ts

Prerequisite: slices 1–3 complete.

## RootRouter (required — do this first)
Use MCP server `rootrouter`:
1. index_repo — path: /Users/main/MotusDAO-Hub-Psi/motusdao-hub
2. select_context — query: "Academy slice 4 learner enrollment lesson player Enrollment progress contentMDX gated API PublicCourseDetail", tokenBudget: 4000
3. Read ONLY select_context results + specs/academy-learner-player.md (do not @ folders or run broad explore)

## Spec
Read: specs/academy-platform-decision.md, specs/academy-learner-player.md, specs/README.md
Implement specs/academy-learner-player.md ONLY.

## Scope
- Replace "Próximamente" CTA in PublicCourseDetail with enroll flow
- POST /api/enrollments with session userId (existing route)
- Paid courses: enroll without payment in v1 (price label only)
- Player: /academia/[slug]/leccion/[lessonSlug]
- Gated API: GET /api/academy/courses/[slug]/lessons/[lessonSlug]
  (content if isFreePreview OR enrolled)
- Render contentMDX with marked; embed videoUrl
- "Marcar como completada" → Enrollment.progress %; completed at 100%
- Free-preview lessons without enrollment; auth required to enroll

## Rules
- Preserve Academia design system
- No per-lesson progress table, no payments, no admin changes
- Non-goals = hard stops
- EduPath = reference only

## QA
npm run lint && npx tsc --noEmit
Verify acceptance criteria 1–8 in the spec.
DEV_BYPASS_ADMIN_AUTH does NOT fake learner session; for API QA use admin bypass + seed userId.

## Done
Call rootrouter stats and report tokens saved.
Evidence: screenshot enrolled course + lesson player with content.
```

---

## Dev admin bypass (local only)

`.env.local`: `DEV_BYPASS_ADMIN_AUTH=1` — restart `npm run dev`. Dev only; remove before deploy.

## Optional QA loop

```bash
export MOTUS_QA_LOOP=1
export MOTUS_ACTIVE_SPEC=specs/academy-learner-player.md
```

Requires `.cursor/hooks.json` in Cursor.
