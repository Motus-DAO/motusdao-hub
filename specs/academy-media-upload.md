# Academy — Lesson Media Upload — Spec

> Status: **LOCKED** · Owner: product + eng · Slice size: ~1 day
>
> Purpose: admins upload **lesson video and PDF resources** via Supabase storage;
> enrolled learners (or free-preview) access media through gated signed URLs.
>
> **Prerequisite:** slices 1–5 complete (admin CRUD, public catalog, learner player,
> `LessonProgress` DB).
>
> Platform decision: see `specs/academy-platform-decision.md` (§4 slice 6, §3 keep `lib/storage.ts`).

---

## 1. Scope (what this slice delivers)

### Storage
- New private Supabase bucket `academy-lessons` (signed URLs, mirrors `professional-documents` pattern).
- Extend `lib/storage.ts` with academy upload + signed-URL helpers.
- Path convention: `{courseId}/{lessonId}/video.{ext}` for video; `{courseId}/{lessonId}/pdfs/{resourceId}.pdf` for PDFs.

### Data model (no migration)
- **Video:** `Lesson.videoUrl` stores either an external `https://` URL (paste, unchanged from slice 2) **or** a storage ref `storage:{path}` after admin upload.
- **PDF:** `Lesson.pdfResources` JSON array:
  ```ts
  { id: string; name: string; storagePath: string; uploadedAt: string }[]
  ```

### Admin APIs (`guardAdmin`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/lessons/[lessonId]/upload-video` | multipart `file` → updates `videoUrl` to `storage:…` |
| POST | `/api/admin/lessons/[lessonId]/upload-pdf` | multipart `file` + optional `name` → appends to `pdfResources` |
| DELETE | `/api/admin/lessons/[lessonId]/pdf/[resourceId]` | removes PDF entry (+ storage object) |

### Learner APIs (gated)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/academy/lessons/[lessonId]/media-url?storagePath=…` | session + enrolled or free-preview (or admin) | signed URL for video/PDF |
| GET | `/api/academy/courses/[slug]/lessons/[lessonSlug]` | existing | when `access.allowed`, resolve `storage:` `videoUrl` to signed URL; include `pdfResources` metadata |

### Admin UI
- Extend `app/admin/cursos/[courseId]/page.tsx` lesson dialog:
  - Video: keep URL paste **plus** file upload control; show indicator when `storage:` ref is set.
  - PDF: list attached PDFs with upload + delete.

### Learner UI
- `LessonPlayer`: show PDF download links (fetch signed URL per resource); `VideoEmbed` plays resolved signed URL for uploaded video.

## 2. Non-goals (explicitly out of scope)

- **No payments / Stripe** (slice 7).
- **No Mux** or dedicated video hosting platform.
- **No transcoding** or multi-bitrate streaming.
- **No drag-and-drop reorder** of PDFs.
- **No WYSIWYG** or rich-text changes.
- **No breaking** slices 4–5: enrollment gating, `LessonProgress`, progress bar, catalog cache behavior.
- **No EduPath wholesale import** — extend MotusDAO `lib/storage.ts` only.

## 3. Context / anchors

- `lib/storage.ts`, `lib/storage-auth.ts` — upload + signed URL patterns
- `app/api/profile/upload-document/route.ts` — multipart admin-style upload reference
- `app/api/profile/document-url/route.ts` — signed URL + auth reference
- `prisma/schema.prisma` — `Lesson.videoUrl`, `Lesson.pdfResources` (existing)
- `app/admin/cursos/[courseId]/page.tsx` — lesson editor (`videoUrl` paste-only today)
- `components/academy/LessonPlayer.tsx` — `VideoEmbed`, markdown panel
- `app/api/academy/courses/[slug]/lessons/[lessonSlug]/route.ts` — gated content
- `lib/academy/admin-content.ts` — Zod schemas for lesson fields

## 4. Acceptance criteria (Given / When / Then)

### Admin upload
1. **Given** an admin editing a lesson, **when** they upload an MP4/WebM video, **then** `Lesson.videoUrl` is set to `storage:{courseId}/{lessonId}/video.{ext}` and the file exists in `academy-lessons`.
2. **Given** an admin, **when** they upload a PDF with display name, **then** `pdfResources` gains an entry with `id`, `name`, `storagePath`, `uploadedAt`.
3. **Given** an admin, **when** they delete a PDF resource, **then** the JSON entry is removed and the storage object is deleted (best-effort).
4. **Given** an admin, **when** they paste an external `https://` video URL, **then** behavior is unchanged from slice 2 (no storage ref).

### Learner access
5. **Given** an enrolled user on an allowed lesson with uploaded video, **when** the player loads, **then** the video plays via a signed URL (not raw storage path).
6. **Given** an enrolled user, **when** they click a PDF resource, **then** they receive a signed download URL.
7. **Given** a free-preview lesson with uploaded media, **when** a non-enrolled user opens it, **then** they can access media (same as slice 4 preview rules).

### Gating / security
8. **Given** a non-enrolled user on a locked (non-preview) lesson, **when** they call the gated lesson API or media-url, **then** storage-backed `videoUrl` is not exposed as a playable signed URL; PDFs are not listed.
9. **Negative — admin auth:** non-admin POST upload routes → `401/403`, no writes.
10. **Negative — validation:** upload with invalid MIME or oversize file → `400`, no DB change.
11. **Negative — learner media-url:** unauthenticated or non-enrolled (non-preview) → `403`.

### Regression
12. Slices 4–5 unchanged: enrollment, progress POST/GET, catalog cache, `DEV_BYPASS_ADMIN_AUTH` does not fake learner session.

## 5. Data / schema changes

- **None** — `videoUrl` and `pdfResources` already exist on `Lesson`.
- Migration: not required.
- Seed: optional comment in `prisma/seed.ts`; E2E evidence via admin upload of at least one video + PDF.

## 6. API contract

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/admin/lessons/[lessonId]/upload-video` | admin | `multipart: file` | `{ videoUrl, storagePath }` | MP4/WebM, max 100MB |
| POST | `/api/admin/lessons/[lessonId]/upload-pdf` | admin | `multipart: file, name?` | `{ pdfResources }` | PDF only, max 10MB |
| DELETE | `/api/admin/lessons/[lessonId]/pdf/[resourceId]` | admin | — | `{ pdfResources }` | |
| GET | `/api/academy/lessons/[lessonId]/media-url` | session | `?storagePath=` | `{ signedUrl, expiresIn }` | path must belong to lesson |

## 7. QA gate (Definition of Done for this slice)

- [ ] Acceptance criteria 1–12 verified.
- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] Non-goals respected.
- [ ] Evidence: admin upload screenshot + learner player showing uploaded video/PDF.

## 8. Exit conditions

Loop stops when all acceptance criteria pass, QA gate is green, and no critical findings.

## 9. Decisions — LOCKED

1. **Bucket:** `academy-lessons` (private, signed URLs) — new entry in `STORAGE_BUCKETS`.
2. **Video ref format:** `storage:{path}` in `Lesson.videoUrl`; external URLs unchanged.
3. **Signed URL TTL:** 3600s (match `professional-documents`).
4. **Video MIME:** `video/mp4`, `video/webm`; max 100MB.
5. **PDF MIME:** `application/pdf` only; max 10MB; multiple PDFs per lesson allowed.
6. **Gated lesson API** resolves `storage:` video to signed URL only when `access.allowed`; locked lessons get `videoUrl: null` for storage refs.
7. **PDF list** returned only when `access.allowed`.
8. **Admin preview** of uploaded media uses same `media-url` route (admin bypass via `guardAdmin`).
9. **No Prisma migration** this slice.
10. **No Mux, no payments** this slice.
