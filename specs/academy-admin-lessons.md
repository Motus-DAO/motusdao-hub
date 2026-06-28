# Academy — Admin Module & Lesson Editor — Spec

> Status: **DRAFT for review** · Owner: product + eng · Slice size: ~1–2 days
>
> Purpose: let admins **author course structure** — modules and lessons with
> markdown content, publish flags, and ordering — so a course is playable from
> the DB without hardcoded content files.
>
> **Prerequisite:** slice 1 (`specs/academy-admin-courses.md`) must be merged or
> at least have `/admin/cursos` + `/api/admin/courses` working.
>
> Platform decision: see `specs/academy-platform-decision.md` (EduPath-LMS as reference, selective integration).
>
> Anchors (built from current code):
> - `prisma/schema.prisma` — `Module`, `Lesson` (nested under `Course`)
> - `prisma/seed.ts` — existing module/lesson seed pattern (`module_${courseId}_default`, `lesson_${courseId}_${slug}`)
> - `app/api/courses/route.ts` — public `GET` already returns `modules.lessons` (published only)
> - `lib/auth/admin-route.ts` — `guardAdmin(request)`
> - Slice 1 routes: `/api/admin/courses`, `/admin/cursos`

---

## 1. Scope (this slice)

From `/admin/cursos`, an admin can open a **course editor** and:

### Modules
- List modules for a course (ordered by `order`).
- Create a module (`title`, optional `summary`, `order`).
- Edit module fields.
- Delete a module (cascades lessons per schema).
- Reorder modules (update `order` values).

### Lessons (within a module)
- List lessons for a module (ordered by `order`).
- Create a lesson (`title`, `slug`, optional `summary`, `contentMDX`, `duration`,
  `isPublished`, `isFreePreview`, optional `videoUrl` as a **URL string only**).
- Edit lesson fields.
- Delete a lesson.
- Reorder lessons (update `order` values).

### Publish workflow
- Lesson `isPublished` controls visibility in public `GET /api/courses`.
- Course-level `isPublished` from slice 1 still gates the whole course.

## 2. Non-goals (explicitly out of scope for this slice)

- **No file/video/PDF upload** — `videoUrl` is a pasted URL only; `pdfResources` untouched.
- **No rich-text/WYSIWYG editor** — `contentMDX` is a plain textarea (markdown).
- **No public Academy page changes** — wiring `app/academia/*` to DB is slice 3.
- **No learner player / enrollment UI** — slice 4.
- **No per-lesson progress table** — slice 5.
- **No drag-and-drop reorder UI required** — up/down buttons or numeric `order` input is fine for v1.

## 3. Context / anchors

### `Module` model
`id, courseId, title, summary?, order (default 0), createdAt, updatedAt`
- `id` and `updatedAt` have **no DB default** — supply `cuid()` + `new Date()` on create.
- `onDelete: Cascade` from `Course`.

### `Lesson` model
`id, moduleId?, title, slug, contentMDX?, order, duration?, isPublished (default false),
isFreePreview (default false), summary?, videoUrl?, pdfResources?, createdAt, updatedAt`
- `id` and `updatedAt` have **no DB default** — supply on create.
- `moduleId` is required for lessons in this slice (always attach to a module).
- No unique constraint on `slug` globally — scope uniqueness to **within a module**
  in validation (or `moduleId + slug` composite check in handler).

### Seed pattern (reference)
```ts
id: `module_${courseId}_default`
id: `lesson_${courseId}_${slug}`
```
New admin-created records should use `cuid()` instead (seed IDs are legacy).

### Admin guard
Every handler: `const denied = await guardAdmin(request); if (denied) return denied`.

---

## 4. Acceptance criteria (Given / When / Then)

### Modules
1. **Given** an admin on `/admin/cursos/[courseId]`, **when** the page loads, **then**
   they see the course title and an ordered list of its modules.
2. **Given** an admin, **when** they create a module with `title`, **then** a `Module`
   row is created with the correct `courseId` and appears in the list.
3. **Given** an existing module, **when** an admin edits `title`/`summary` and saves,
   **then** the row updates and `updatedAt` advances.
4. **Given** an existing module, **when** an admin deletes it (with confirmation), **then**
   the module and its lessons are removed (cascade).
5. **Given** multiple modules, **when** an admin changes `order`, **then** the list
   reflects the new order on reload.

### Lessons
6. **Given** an admin viewing a module, **when** they expand it, **then** they see
   an ordered list of lessons (title, slug, published, duration).
7. **Given** an admin, **when** they create a lesson with `title` + `slug` + `contentMDX`,
   **then** a `Lesson` row is created under that module (default `isPublished=false`).
8. **Given** an existing lesson, **when** an admin toggles `isPublished`, **then**
   public `GET /api/courses` includes/excludes it accordingly (when course is also published).
9. **Given** an existing lesson, **when** an admin sets `isFreePreview=true`, **then**
   the field persists (used by slice 4 player).
10. **Given** an existing lesson, **when** an admin deletes it (with confirmation), **then**
    the row is removed.

### Negative paths
11. **Negative — auth:** non-admin calls any `/api/admin/modules` or `/api/admin/lessons`
    route → `401/403`, no writes.
12. **Negative — validation:** create lesson with duplicate `slug` within the same module
    → `400`, no row written.
13. **Negative — orphan:** create lesson without `moduleId` or with invalid `moduleId`
    → `400`, no row written.

## 5. Data / schema changes

- **None required** — `Module` and `Lesson` models already exist.
- Migration: not needed.
- Seed impact: none required.

## 6. API contract

All routes use `guardAdmin`. Validate with Zod.

### Modules

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| GET | `/api/admin/courses/[courseId]/modules` | — | `{ modules: Module[] }` | Include `lessons` ordered by `order`. |
| POST | `/api/admin/courses/[courseId]/modules` | `{ title, summary?, order? }` | `{ module }` `201` | `id` via `cuid()`, `updatedAt` set. |
| PATCH | `/api/admin/modules/[moduleId]` | partial fields | `{ module }` | |
| DELETE | `/api/admin/modules/[moduleId]` | — | `{ ok: true }` | Cascades lessons. |

### Lessons

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| POST | `/api/admin/modules/[moduleId]/lessons` | `{ title, slug, summary?, contentMDX?, duration?, order?, isPublished?, isFreePreview?, videoUrl? }` | `{ lesson }` `201` | `id` via `cuid()`. |
| PATCH | `/api/admin/lessons/[lessonId]` | partial fields | `{ lesson }` | |
| DELETE | `/api/admin/lessons/[lessonId]` | — | `{ ok: true }` | |
| PATCH | `/api/admin/courses/[courseId]/modules/reorder` | `{ moduleIds: string[] }` | `{ modules }` | Optional convenience; or handle via per-module PATCH. |
| PATCH | `/api/admin/modules/[moduleId]/lessons/reorder` | `{ lessonIds: string[] }` | `{ lessons }` | Optional convenience. |

Duplicate slug within module → catch and return `400`.

## 7. UI

- New page: `app/admin/cursos/[courseId]/page.tsx` (course structure editor).
- Entry point: "Editar contenido" (or similar) link from each row on `/admin/cursos`.
- Layout:
  - Course header (title, slug, back link).
  - Module list (accordion or nested cards).
  - Per module: lesson list + "Nueva lección" form/dialog.
  - "Nuevo módulo" button at course level.
- Use MotusDAO admin patterns: `GlassCard`, `authFetch`, existing admin layout.
- `contentMDX`: monospace textarea, ~10 rows; no preview required in v1.

## 8. QA gate (Definition of Done for this slice)

- [ ] Acceptance criteria 1–13 verified.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Non-admin rejected on every new route.
- [ ] Duplicate lesson slug within module → `400`.
- [ ] Published lesson appears in `GET /api/courses` nested response.
- [ ] Delete module cascades lessons (verify in DB or API).
- [ ] Evidence: screenshot of course editor with at least 1 module + 2 lessons.
- [ ] Non-goals respected (no upload, no public page, no player).

## 9. Exit conditions

Loop stops when all acceptance criteria pass, QA gate is green, and no critical findings.
Depends on slice 1 being complete (course list + course CRUD APIs exist).

## 10. Decisions — LOCKED

1. **Prerequisite:** slice 1 (`academy-admin-courses.md`) must land first.
2. **Lesson content:** markdown textarea only; no WYSIWYG in v1.
3. **Video:** URL string field only; upload is a later slice.
4. **Slug uniqueness:** scoped to module, not global.
5. **IDs:** `cuid()` for admin-created modules/lessons (not seed-style prefixed IDs).
6. **Reorder:** `order` integer field; simple up/down or numeric input is enough for v1.
