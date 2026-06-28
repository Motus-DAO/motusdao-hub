# <Feature Name> — Spec

> Status: **DRAFT for review** · Owner: <name> · Slice size: <≤1 day?>
>
> Purpose: one sentence on the user-visible outcome. Link the codebase anchors
> this is built from (files, models, routes).

---

## 1. Scope (what this slice delivers)

One **user-visible behavior**. If you need "and", consider splitting into another spec.

- <e.g. Admin can create a course (title + slug) and see it persisted in the DB.>

## 2. Non-goals (explicitly out of scope)

Protects against drift. Be specific.

- <e.g. No video upload in this slice.>
- <e.g. No public Academy UI changes in this slice.>

## 3. Context / anchors

Files, models, and routes this slice touches or depends on.

- `prisma/schema.prisma` — <models involved>
- `app/api/...` — <routes involved>
- `app/...` — <pages/components involved>

## 4. Acceptance criteria (Given / When / Then)

Each criterion must map to at least one test or check. Number them; QA verifies each.

1. **Given** <state>, **when** <action>, **then** <observable result>.
2. **Negative path:** **given** <invalid input>, **when** <action>, **then** <rejected with message X>.
3. ...

## 5. Data / schema changes

- Prisma model deltas: <fields/relations added>
- Migration: <name> + **rollback note** (how to revert safely).
- Seed impact: <does `prisma/seed.ts` need updating?>

## 6. API contract (if any)

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| <GET>  | `/api/...` | <admin/self/public> | <body/query> | <shape> | |

## 7. QA gate (Definition of Done for this slice)

- [ ] All acceptance criteria above pass (mapped to checks/tests).
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] At least one negative-path check exists.
- [ ] Migration + rollback note present (if schema changed).
- [ ] Evidence attached (changed files, gate output, screenshot for UI).
- [ ] Non-goals respected.

## 8. Exit conditions (when the loop stops)

The loop ends when: **all acceptance criteria pass AND the QA gate is green AND
no open critical findings.** If `loop_limit` is hit first, escalate to a human with
the latest failure summary.

## 9. Decisions — LOCKED

Resolve ambiguity before coding. If code contradicts the spec, fix the code;
if the spec is wrong, revise the spec first, then re-run the loop.

1. <decision>
2. <decision>
