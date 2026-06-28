# Academy — Public Catalog DB Wiring — Spec

> Status: **DRAFT for review** · Owner: product + eng · Slice size: ~1 day
>
> Purpose: replace **hardcoded** Academy pages with data from the DB via
> `GET /api/courses`, so published courses authored in admin appear on the
> public catalog without code changes.
>
> **Prerequisite:** slices 1–2 complete (`/admin/cursos`, module/lesson editor).
>
> Platform decision: see `specs/academy-platform-decision.md`.

---

## 1. Scope (this slice)

### Catalog page (`/academia`)
- Remove hardcoded `courses` array from `app/academia/page.tsx`.
- Fetch published courses from `GET /api/courses` (client or server component).
- Render course cards from DB fields: `title`, `slug`, `summary`, `imageUrl`,
  `category`, `difficulty`, `priceAmount`, `priceCurrency`, `rating`, `reviewCount`.
- Derive lesson count from nested `modules.lessons.length` (published lessons only).
- Link each card to `/academia/[slug]` (use `course.slug`, not numeric id).

### Course detail page (`/academia/[courseId]`)
- Replace hardcoded `courseData` object with DB fetch by slug.
- Route param is **slug** (keep `[courseId]` folder name or rename to `[slug]` — prefer slug lookup either way).
- Show course metadata + module/lesson outline from API response.
- Only show **published** courses; unpublished → 404 or friendly "no disponible".
- Lesson list: title, duration, `isFreePreview` badge where applicable.
- **No enrollment/player yet** — CTA can be "Próximamente" or disabled "Inscribirse" (slice 4).

### Legacy static route
- `app/academia/ia-para-psicologos/page.tsx` + `content/courses/ia-para-psicologos.ts`:
  - **Option A (preferred):** redirect `/academia/ia-para-psicologos` → DB course with same slug if it exists.
  - **Option B:** keep static page as fallback only when DB course missing.
  - Document choice in PR.

### API gap (if needed)
- If `GET /api/courses` lacks fields needed for the UI (e.g. lesson count aggregation),
  extend the route minimally — do not add admin fields to public response.

## 2. Non-goals

- **No learner enrollment or lesson player** (slice 4).
- **No progress tracking** (slice 5).
- **No payments/checkout** (slice 7).
- **No admin UI changes.**
- **No markdown rendering in lesson body on public page** — outline/metadata only.

## 3. Context / anchors

- Hardcoded today:
  - `app/academia/page.tsx` — mock `courses` array
  - `app/academia/[courseId]/page.tsx` — mock `courseData`
  - `app/academia/ia-para-psicologos/page.tsx` — static content import
- Public API: `app/api/courses/route.ts` — already returns published courses + modules + published lessons
- Seed slugs (reference): `fundamentos-mindfulness`, `manejo-ansiedad-estres`, `comunicacion-asertiva` (verify in `prisma/seed.ts`)

## 4. Acceptance criteria

1. **Given** published courses in DB, **when** user opens `/academia`, **then** only published courses appear (no hardcoded-only cards).
2. **Given** a draft (`isPublished=false`) course in DB, **when** user opens `/academia`, **then** it does **not** appear in the catalog.
3. **Given** a published course with slug `X`, **when** user opens `/academia/X`, **then** they see correct title, summary, modules, and published lessons from DB.
4. **Given** an unknown slug, **when** user opens `/academia/unknown-slug`, **then** they see a 404 or "curso no encontrado" — not a crash.
5. **Given** seed data with published course, **when** admin toggles course to unpublished, **then** it disappears from `/academia` after refresh.
6. **Negative:** empty DB / no published courses → empty state UI (not broken layout).

## 5. Data / schema changes

- None expected.

## 6. UI notes

- Preserve existing Academia visual design (GlassCard, motion, layout).
- Add loading and error states for fetch.
- Empty state: friendly message when no published courses exist.

## 7. QA gate

- [ ] Criteria 1–6 verified against seed or admin-created course.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] No hardcoded course arrays remain in `app/academia/page.tsx` or `[courseId]/page.tsx`.
- [ ] Screenshot: `/academia` with ≥1 DB course + `/academia/<slug>` detail page.
- [ ] Non-goals respected.

## 8. Exit conditions

Loop stops when acceptance criteria pass and QA gate is green.

## 9. Decisions — LOCKED

1. **Slug is the public URL key** (`/academia/[slug]`).
2. **Public pages are read-only** — no auth required to browse catalog.
3. **Enrollment CTA is placeholder** until slice 4.
4. **Prefer redirect** for `ia-para-psicologos` if DB course exists with that slug.
