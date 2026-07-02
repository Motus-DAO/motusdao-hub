# PSM public profile — Spec

> Status: **IMPLEMENTED** · Owner: MotusDAO · Slice: marketplace profile + booking

Public therapist profiles at `/psicoterapia/[slug]` with embedded scheduling, reviews, and SEO. Intro video is optional and acts as a visibility/ordering boost in the roster.

## Acceptance criteria

1. **Given** an approved PSM with slug, **when** visiting `/psicoterapia/{slug}`, **then** full profile renders with narratives, exclusions, and $45 USD price (video optional).
2. **Given** two eligible PSMs, **when** fetching `GET /api/psm`, **then** profiles with approved intro video are ranked higher for visibility.
3. **Given** a logged-in usuario, **when** booking an open slot via `POST /api/psm/{slug}/book`, **then** a manual `Match` and `Session` are created.
4. **Given** zero reviews, **when** viewing profile, **then** UI shows "Sin opiniones aún" without fake stars.
5. **Given** ≥3 published reviews, **when** viewing profile, **then** numeric average is shown.
6. **Given** profile slug, **when** crawlers fetch page, **then** `generateMetadata` and JSON-LD are present.
