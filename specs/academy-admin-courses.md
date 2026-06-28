# Academy — Admin Course CRUD — Spec

> Status: **DRAFT for review** · Owner: product + eng · Slice size: ~1 day (course-level only)
>
> Purpose: give admins a real way to **create, edit, publish, and delete courses**
> in the DB so the Academy stops being hardcoded. This is the first slice of the
> Coursera/Udemy-style build.
>
> Platform decision: see `specs/academy-platform-decision.md` (EduPath-LMS as reference, selective integration).
>
> Anchors (built from current code):
> - `prisma/schema.prisma` — `Course`, `Module`, `Lesson`, `Enrollment`
> - `app/api/courses/route.ts` — public `GET` (published courses) already exists
> - `lib/auth/admin-route.ts` — `guardAdmin(request)` admin guard
> - `components/admin/AdminSidebar.tsx` — already links to `/admin/cursos` (no page yet)
> - `app/api/admin/stats/route.ts` — already counts `publishedCourses`

---

## 1. Scope (this slice)

Admin can **manage courses at the course level** through `/admin/cursos`:

- List all courses (published + drafts).
- Create a course (title, slug, summary, category, difficulty, price, publish flag).
- Edit an existing course's fields.
- Toggle publish/unpublish.
- Delete a course (with confirmation).

Backed by new admin API routes and the existing `Course` model.

## 2. Non-goals (explicitly out of scope for this slice)

- **No module/lesson editor yet** (that is the next spec: `academy-admin-lessons.md`).
- **No media/video/PDF upload yet** (later slice; reuse `lib/storage.ts` then).
- **No changes to the public `app/academia` pages** in this slice (wiring the
  catalog to the DB is its own spec to keep blast radius small).
- **No payments/enrollment changes.**
- **No per-lesson progress table.**

## 3. Context / anchors

- Model `Course` fields available now: `id, title, slug, summary, description,
  imageUrl, isPublished, category, difficulty (enum CourseDifficulty),
  instructor, instructorBio, instructorImage, instructorTitle, learningOutcomes (Json),
  rating, reviewCount, priceAmount (Decimal), priceCurrency, createdAt, updatedAt`.
- **Important:** `Course.id` and `updatedAt` have **no DB default** — the create
  handler must supply `id` (use `cuid()`) and set `updatedAt`.
- Admin guard pattern: call `const denied = await guardAdmin(request); if (denied) return denied`.
- Mirror existing admin route style in `app/api/admin/*` (e.g. `users/route.ts`).

## 4. Acceptance criteria (Given / When / Then)

1. **Given** an authenticated admin, **when** they open `/admin/cursos`, **then**
   they see a table of all courses (title, slug, published state, price) including drafts.
2. **Given** an admin on `/admin/cursos`, **when** they submit the "new course"
   form with a unique `title` + `slug` + `summary`, **then** a `Course` row is
   created (default `isPublished=false`) and appears in the list.
3. **Given** an existing course, **when** an admin edits a field and saves, **then**
   the `Course` row is updated and `updatedAt` advances.
4. **Given** an existing course, **when** an admin toggles publish, **then**
   `isPublished` flips and the public `GET /api/courses` reflects it.
5. **Given** an existing course, **when** an admin confirms delete, **then** the
   `Course` row (and cascaded modules/lessons/enrollments) is removed.
6. **Negative — auth:** **given** a non-admin (or no session), **when** they call
   any `/api/admin/courses` method, **then** they get `401/403` (via `guardAdmin`)
   and no data changes.
7. **Negative — validation:** **given** a duplicate `slug` or missing required
   field, **when** create/update is submitted, **then** the API returns `400`
   with a friendly message and no row is written.

## 5. Data / schema changes

- **None required** — the `Course` model already has every field this slice needs.
- Migration: **not needed** for this slice. (Module/lesson editor and per-lesson
  progress will need migrations in later specs — include rollback notes then.)
- Seed impact: none required; existing `prisma/seed.ts` still valid.

## 6. API contract

All under `app/api/admin/courses/`. Every handler starts with `guardAdmin`.

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET    | `/api/admin/courses` | — | `{ courses: Course[] }` | All courses incl. drafts. |
| POST   | `/api/admin/courses` | `{ title, slug, summary, description?, category?, difficulty?, priceAmount?, priceCurrency?, isPublished? }` | `{ course }` `201` | Generate `id` via `cuid()`, set `updatedAt`. Validate with Zod. |
| GET    | `/api/admin/courses/[courseId]` | — | `{ course }` | Includes modules for later. |
| PATCH  | `/api/admin/courses/[courseId]` | partial course fields | `{ course }` | Bump `updatedAt`. |
| DELETE | `/api/admin/courses/[courseId]` | — | `{ ok: true }` | Cascades per schema. |

Validation: define a Zod schema (mirror repo convention) for create/update.
Unique `slug` violation → `400` (catch Prisma `P2002`).

## 7. UI

- New page `app/admin/cursos/page.tsx` behind the existing admin layout/auth gate.
- Course table + "Nuevo curso" dialog (create) + per-row edit/publish/delete.
- Follow MotusDAO Hub design system (glass cards, tokens) and existing admin pages.

## 8. QA gate (Definition of Done for this slice)

- [ ] Acceptance criteria 1–7 each verified (happy + both negative paths).
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Manual/automated check that non-admin is rejected on every method.
- [ ] Duplicate-slug create returns `400`, writes nothing.
- [ ] Publish toggle visibly changes `GET /api/courses` output.
- [ ] Evidence attached: changed files + screenshot of `/admin/cursos`.
- [ ] Non-goals respected (no lesson editor, no upload, no public-page edits).

## 9. Exit conditions

Loop stops when all acceptance criteria pass, the QA gate is green, and there are
no open critical findings. If `loop_limit` is hit first, escalate with the latest
gate output.

## 10. Decisions — LOCKED

1. **Slice boundary:** course-level CRUD only. Modules/lessons are the next spec.
2. **IDs:** generate with `cuid()` in the handler (schema has no DB default).
3. **New courses default to `isPublished=false`** (draft-first).
4. **Delete is hard delete** (relies on schema `onDelete: Cascade`); guarded by a
   confirmation dialog in the UI.
5. **Public Academy pages stay hardcoded this slice** — DB wiring is a separate spec.
