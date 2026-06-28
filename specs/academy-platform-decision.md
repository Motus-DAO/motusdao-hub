# Academy Platform Decision — LOCKED

> Status: **LOCKED** · Owner: product + eng · Date: 2026-06-25
>
> Purpose: prevent drift during Academy build. All agents (Cursor, Codex, subagents)
> must follow this decision unless explicitly revised by a human.

---

## 1. Decision summary

| Question | Decision |
|----------|----------|
| Primary OSS reference | **EduPath-LMS** (MIT) |
| Secondary benchmark | **Nexus-LMS-OpenSource** (MIT) — reference only, not primary |
| Adoption mode | **Selective integration** into existing `motusdao-hub` |
| Full repo transplant | **No** |

**Repos:**
- Primary: [github.com/theeaashish/EduPath-LMS](https://github.com/theeaashish/EduPath-LMS)
- Benchmark: [github.com/imranbru99/Nexus-LMS-OpenSource](https://github.com/imranbru99/Nexus-LMS-OpenSource)

---

## 2. Why EduPath over Nexus (for now)

| Criterion | EduPath | Nexus |
|-----------|---------|-------|
| Stack fit (Next + Prisma + Postgres/Supabase) | Strong | Good |
| Integration speed into `motusdao-hub` | Faster | Slower (heavier surface) |
| Feature breadth out of the box | Moderate | Broader |
| Risk of merge/adaptation trap | Lower | Higher |
| Fit for immediate slice (admin course CRUD) | Best | Overkill for v1 |

**Verdict:** EduPath is the implementation reference. Nexus is consulted later for feature-parity ideas (reviews, richer catalog UX, advanced instructor flows).

---

## 3. What we port vs what we keep

### Keep from `motusdao-hub` (do not replace)

- Auth/session: `lib/auth/*`, `guardAdmin`, existing admin layout
- Prisma schema as source of truth: `Course`, `Module`, `Lesson`, `Enrollment`
- Supabase storage patterns: `lib/storage.ts`, existing upload routes
- MotusDAO design system and admin UI conventions
- Existing public routes until wired slice-by-slice

### Borrow from EduPath (selective)

- Admin course CRUD patterns (API shape, validation, list/detail UX ideas)
- Module/lesson authoring flow (next spec)
- Publish/draft workflow patterns
- Enrollment + progress UX patterns (later slices)
- Zod validation and API route organization where it maps cleanly

### Do NOT port wholesale

- EduPath auth system (replace with MotusDAO auth)
- EduPath payment stack (defer; MotusDAO has its own order/enrollment model)
- EduPath DB schema as a full replacement (extend ours, don't swap)
- Nexus as a base fork (too heavy for v1)

---

## 4. Implementation order (locked sequence)

1. **Admin course CRUD** — `specs/academy-admin-courses.md` (current)
2. **Admin module/lesson editor** — `specs/academy-admin-lessons.md` (next)
3. **Wire public Academy catalog to DB** — replace hardcoded `app/academia/*`
4. **Learner enrollment + lesson player** — progress at enrollment level first
5. **Per-lesson progress** — schema extension + migration
6. **Media upload** — video/PDF via Supabase storage
7. **Payments integration** — connect to existing `Order`/`OrderItem` model

Each slice is a separate spec. One user-visible behavior per loop run.

---

## 5. Non-goals (platform level)

- No full EduPath or Nexus repo fork/transplant
- No AGPL/GPL LMS (Open edX, Moodle, LearnHouse) — license incompatible
- No rewrite of MotusDAO auth, onboarding, or PSM flows for Academy
- No video hosting platform build (use Supabase storage + external player; Mux later if needed)
- No mobile app in v1

---

## 6. Handoff contract for agents

Any agent picking up Academy work must:

1. Read this file first.
2. Read the active slice spec (e.g. `specs/academy-admin-courses.md`).
3. Read `specs/README.md` for loop + QA + DoD rules.
4. Use EduPath as **reference**, not as a drop-in replacement.
5. Respect non-goals. If a decision is ambiguous, stop and ask — do not guess.
6. Enable the QA loop when implementing:
   ```bash
   export MOTUS_QA_LOOP=1
   export MOTUS_ACTIVE_SPEC=specs/academy-admin-courses.md
   ```

---

## 7. Exit criteria for "Academy v1 done"

- [ ] Admin can create/edit/publish/delete courses, modules, and lessons via `/admin/cursos`
- [ ] Public `/academia` reads from DB (no hardcoded course arrays)
- [ ] Learner can enroll and view lesson content
- [ ] Progress persists across refresh
- [ ] At least one real course seeded and playable end-to-end
- [ ] QA loop + acceptance criteria pass for every slice spec

---

## 8. Decisions — LOCKED

1. **Primary OSS reference:** EduPath-LMS
2. **Secondary benchmark:** Nexus-LMS (reference only)
3. **Adoption mode:** selective integration, not full transplant
4. **Schema:** extend existing Prisma models; no wholesale schema swap
5. **Auth:** keep MotusDAO `guardAdmin` / session; do not import EduPath auth
6. **Slice order:** course CRUD → lessons → public wire → enrollment → progress → media → payments
