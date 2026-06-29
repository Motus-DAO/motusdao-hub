# PSM public profile — Spec

> Status: **IMPLEMENTED** · Owner: MotusDAO · Slice: marketplace profile + booking

Public therapist profiles at `/psicoterapia/[slug]` with embedded scheduling, reviews, SEO, and roster gating on approved intro video.

## Acceptance criteria

1. **Given** an approved PSM with `introVideoApproved` and slug, **when** visiting `/psicoterapia/{slug}`, **then** full warm profile renders with video, narratives, exclusions, and $45 USD price.
2. **Given** a PSM without approved intro video, **when** fetching `GET /api/psm`, **then** they are excluded from the roster.
3. **Given** a logged-in usuario, **when** booking an open slot via `POST /api/psm/{slug}/book`, **then** a manual `Match` and `Session` are created.
4. **Given** zero reviews, **when** viewing profile, **then** UI shows "Sin opiniones aún" without fake stars.
5. **Given** ≥3 published reviews, **when** viewing profile, **then** numeric average is shown.
6. **Given** profile slug, **when** crawlers fetch page, **then** `generateMetadata` and JSON-LD are present.
