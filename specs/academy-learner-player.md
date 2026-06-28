# Academy — Learner Enrollment + Lesson Player — Spec

> Status: **DRAFT for review** · Owner: product + eng · Slice size: ~1–2 days
>
> Purpose: first **learner experience** — enroll in a published course, open lessons,
> view markdown content and video URL, with coarse course-level progress on
> `Enrollment.progress`.
>
> **Prerequisite:** slices 1–3 complete (admin authoring + public DB catalog).
>
> Platform decision: see `specs/academy-platform-decision.md`.

---

## 1. Scope (this slice)

### Enrollment
- Replace disabled "Próximamente" CTA on `PublicCourseDetail` with real enroll flow.
- Logged-in user (SIWE session with `userId`) can enroll via existing `POST /api/enrollments`.
- **Free courses** (`priceAmount` 0 or null / `isFree`): one-click enroll.
- **Paid courses:** enroll without payment in v1 (slice 7 adds checkout) — show price but allow enroll for testing OR gate with message "Pago próximamente" for paid only; **decision locked below**.
- Show enrolled state on course detail ("Continuar curso" / progress %).
- `GET /api/enrollments?userId=` for current user's enrollments (existing route).

### Lesson player
- New route: `/academia/[slug]/leccion/[lessonSlug]` (or `/learn/...` — pick one, document in PR).
- Sidebar/outline: modules + lessons (reuse course structure from public types).
- Main panel: lesson `title`, `summary`, rendered `contentMDX` (basic markdown → HTML, use existing `marked` dep if suitable), optional `videoUrl` embed (iframe or `<video>` for direct URLs).
- **Access rules:**
  - `isFreePreview` lessons: readable without enrollment.
  - Other published lessons: require active `Enrollment` for that `courseId`.
  - Unpublished / unknown lesson → 404.

### Lesson content API (new, gated)
- Do **not** expose full `contentMDX` on public `GET /api/courses` for all lessons long-term.
- Add `GET /api/academy/courses/[slug]/lessons/[lessonSlug]` (or equivalent):
  - Returns lesson content only if free preview OR user is enrolled (session + enrollment check).
  - Returns metadata-only or 403 for locked lessons.
- Strip `contentMDX` from public list endpoint if needed (optional hardening in this slice).

### Progress (course-level only)
- On lesson complete (manual "Marcar como completada" button): update `Enrollment.progress` as `round(completedLessons / totalPublishedLessons * 100)`.
- Set `Enrollment.completed = true` when progress reaches 100.
- Persist across refresh (read from enrollment on load).
- **No per-lesson progress table** (slice 5).

### My courses (minimal)
- Optional: `/academia/mis-cursos` listing enrollments for logged-in user, OR link from Academia header — keep minimal if timeboxed.

## 2. Non-goals

- Per-lesson progress table / resume position (slice 5).
- Payments / Stripe / Order flow (slice 7).
- PDF upload playback, quiz, certificates.
- Admin UI changes.
- Comments / reviews submission.

## 3. Context / anchors

- `components/academy/PublicCourseDetail.tsx` — placeholder CTA to replace
- `lib/academy/public-course.ts` — public types + fetch helpers
- `app/api/enrollments/route.ts` — existing POST/GET
- `lib/auth/client.ts` — `fetchAppSession`, `authFetch`
- `lib/auth/guards.ts` — `requireSelfOrAdmin`, `requireSession`
- `prisma/schema.prisma` — `Enrollment` (`progress`, `completed`, `userId`, `courseId`)
- `marked` package in `package.json` for MD rendering

## 4. Acceptance criteria

1. **Given** a logged-in user on a free published course, **when** they click Inscribirse, **then** `Enrollment` is created and CTA changes to Continuar / shows progress.
2. **Given** an enrolled user, **when** they open a non-preview lesson URL, **then** they see title + markdown content (+ video if set).
3. **Given** a non-enrolled user, **when** they open a non-preview lesson, **then** they are prompted to enroll (not shown full content).
4. **Given** any user, **when** they open a free-preview lesson without enrolling, **then** content is visible.
5. **Given** an enrolled user, **when** they mark a lesson complete, **then** `Enrollment.progress` updates and survives refresh.
6. **Given** all lessons marked complete, **then** `Enrollment.completed === true`.
7. **Negative:** unauthenticated enroll attempt → redirect or prompt to sign in (no enrollment row).
8. **Negative:** invalid slug/lesson → 404, no crash.

## 5. Data / schema changes

- None required (use existing `Enrollment`).

## 6. API contract (new)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/academy/courses/[slug]/lessons/[lessonSlug]` | optional session | Lesson + content if allowed; 403 if locked; 404 if missing |

Enrollment: reuse `POST /api/enrollments` with `{ userId, courseId }` from session.

## 7. UI

- Match Academia design system (`GlassCard`, `CTAButton`, etc.).
- Player: two-column on desktop (outline + content), stacked on mobile.
- Loading / error states.

## 8. Dev / QA notes

- Admin `DEV_BYPASS_ADMIN_AUTH=1` does **not** fake learner session.
- For API QA without SIWE: admin bypass can `POST /api/enrollments` with a real `userId` from seed, or seed enrollment directly.
- For UI QA: learner needs `fetchAppSession().userId` — document if SIWE unavailable.

## 9. QA gate

- [ ] Criteria 1–8 verified.
- [ ] `npm run lint` && `npx tsc --noEmit` pass.
- [ ] Locked lessons do not leak `contentMDX` via public catalog API (if hardened).
- [ ] Screenshots: enrolled course detail + lesson player with content.
- [ ] Non-goals respected.

## 10. Decisions — LOCKED

1. **Paid courses in v1:** treat same as free for enrollment (no payment gate yet); show price label only. Payments in slice 7.
2. **Progress:** course-level `Enrollment.progress` only; manual "Marcar completada" per lesson.
3. **Markdown:** render with `marked`; no MDX components/runtime in v1.
4. **Video:** URL embed only; no upload.
5. **Player URL:** `/academia/[slug]/leccion/[lessonSlug]`.
