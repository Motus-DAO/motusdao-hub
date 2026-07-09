# PSM Availability — In-app slots + Calendar sync (future)

> Status: **DRAFT** · Owner: product + eng
>
> **Phase 1 (shipped in Step 3):** PSM manages `ProviderAvailabilitySlot` rows via `/disponibilidad`.
> **Phase 2 (future):** Native Google Calendar OAuth; provider-agnostic layer for Outlook/Apple later.

---

## 1. Scope — Phase 1 (current)

- PSM can **list, create, and delete** future availability slots.
- Public marketplace reads slots via `GET /api/psm/[slug]/availability`.
- Booking creates Match + Session + Jitsi `externalUrl` (unchanged).
- Seed script `scripts/seed-psm-availability.ts` for demo/bridge (idempotent).

## 2. Non-goals — Phase 1

- No Google/Outlook/Apple calendar OAuth in this phase.
- No automatic two-way sync.
- No payment collection in booking flow (session `paymentRequired` remains separate).
- No recurring RRULE UI (schema supports `recurrenceRule`; UI deferred).

## 3. Context / anchors

- `prisma/schema.prisma` — `ProviderAvailabilitySlot`
- `app/api/provider-availability/route.ts` — POST, GET
- `app/api/provider-availability/[slotId]/route.ts` — DELETE
- `app/disponibilidad/page.tsx` — PSM UI
- `components/psm/AvailabilityManager.tsx`
- `components/psicoterapia/TherapistBookingCard.tsx` — patient booking
- `app/api/psm/[slug]/book/route.ts` — fulfillment
- `lib/psm/availability.ts` — slot filtering vs booked sessions

## 4. Phase 2 — Calendar sync (LOCKED direction, not implemented)

### Target behavior

1. PSM connects Google Calendar (OAuth 2.0) from `/disponibilidad`.
2. Hub reads **free/busy** (+ optional working hours) and exposes bookable slots on `/psicoterapia/[slug]`.
3. On successful book: create calendar event with Jitsi link; **no PHI in title/description** (patient initials or internal id only — see `clinical-security-compliance.md`).
4. Provider-agnostic interface:

```text
lib/calendar/
  types.ts           # CalendarProviderId, FreeBusyWindow, CalendarEventInput
  provider.ts        # interface CalendarSyncProvider
  providers/
    google.ts        # Phase 2a
    microsoft.ts     # Phase 2b (stub)
    apple-caldav.ts  # Phase 2c (stub)
```

### Env (future)

- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- Encrypted refresh tokens per PSM in DB (new table `psm_calendar_connections`)

### Mock for Phase 1 UI

- `AvailabilityManager` copy notes calendar sync “próximamente”.
- No fake OAuth button that fails — avoid dead UI.

## 5. Acceptance criteria — Phase 1

1. **Given** PSM with SIWE session, **when** they add a future slot on `/disponibilidad`, **then** it appears in their list and on public `GET /api/psm/{slug}/availability`.
2. **Given** a published slot, **when** a `usuario` books via TherapistBookingCard, **then** session is created and perfil shows active session with videochat link.
3. **Given** replay of same slot after book, **when** availability is fetched, **then** booked slot is not offered (overlap filter in `lib/psm/availability.ts`).
4. **Negative:** non-PSM role on `/disponibilidad` sees redirect message, not slot CRUD.

## 6. QA gate — Phase 1

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] Seed or manual slot → book → videochat URL resolves
- [ ] Phase 2 calendar env **not** required for launch

## 7. Decisions — LOCKED

1. In-app slots are the **source of truth** until calendar sync ships.
2. Google Calendar is first external provider; design stays provider-agnostic.
3. Calendar event metadata must not contain PHI or full patient names.
4. Thursday bridge may use `seed-psm-availability.ts`; production PSMs should use `/disponibilidad` ongoing.
