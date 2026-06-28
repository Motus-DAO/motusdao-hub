# Academy — Per-Lesson Progress (DB) — Spec

> Status: **DRAFT for review** · Owner: product + eng · Slice size: ~1 day
>
> Purpose: replace **localStorage** per-lesson completion with a persisted
> `LessonProgress` table so progress survives device/browser changes and is
> queryable server-side.
>
> **Prerequisite:** slice 4 complete (enrollment + lesson player).
>
> Platform decision: see `specs/academy-platform-decision.md`.

---

## 1. Scope

### Schema
- Add `LessonProgress` model:
  - `id`, `userId`, `lessonId`, `enrollmentId` (optional FK), `completed` (bool),
    `completedAt` (DateTime?), `lastPosition` (Int?, seconds for video — optional v1),
    `createdAt`, `updatedAt`
  - Unique on `[userId, lessonId]`
  - Cascade delete with `User` / `Lesson`

### APIs
- `GET /api/academy/enrollments/[enrollmentId]/progress` — list completed lesson IDs + course %
- `POST /api/academy/lessons/[lessonId]/complete` — mark lesson complete (auth + enrolled)
- `DELETE` optional — unmark (low priority; skip if timeboxed)

### Player migration
- Replace `lib/academy/lesson-progress.ts` localStorage reads/writes with API calls.
- On load: fetch progress from server; show checkmarks in outline.
- On "Marcar como completada": POST to API; update `Enrollment.progress` server-side (keep existing PATCH or fold into complete endpoint).
- **One-time:** if localStorage has data for current user+course, migrate on first load then clear local key.

### UI
- Outline shows completed lessons (checkmark) from DB.
- Progress bar on course detail reflects server state after refresh (not just same browser).

## 2. Non-goals

- Video resume position / scrubber persistence (defer `lastPosition` unless trivial).
- Payments (slice 7).
- Media upload (slice 6).
- Admin changes.

## 3. Acceptance criteria

1. **Given** enrolled user marks lesson complete, **when** they refresh or open another browser (same account), **then** lesson stays completed.
2. **Given** completed lessons, **then** `Enrollment.progress` matches server-computed %.
3. **Given** all lessons complete, **then** `Enrollment.completed === true`.
4. **Negative:** non-enrolled user POST complete → 403.
5. **Negative:** unauthenticated → 401.
6. localStorage no longer source of truth (migrated or removed).

## 4. Migration

- Prisma migration required.
- **Rollback:** drop `LessonProgress` table; revert to slice 4 localStorage helper (document in PR).

## 5. QA gate

- [ ] Criteria 1–6 verified.
- [ ] `npm run lint` && `npx tsc --noEmit`.
- [ ] Migration applies cleanly on dev DB.
- [ ] Non-goals respected.

## 6. Decisions — LOCKED

1. **Unique key:** `[userId, lessonId]`.
2. **Progress %:** `round(completedPublishedLessons / totalPublishedLessons * 100)` on server.
3. **Migrate localStorage once** on first player load per user+course.
