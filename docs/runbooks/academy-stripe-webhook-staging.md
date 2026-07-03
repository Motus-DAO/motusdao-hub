# Academy Stripe Webhook Staging Validation

Status: IN PROGRESS  
Scope: Harmonize `platform-harmonize.md` section 12, task 1.

## Goal

Verify staging webhook reliability for Academy checkout so enrollment fulfillment is durable under success and retry/error conditions.

## Preconditions

- Staging deploy is live.
- Staging env vars are set:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
- At least one paid Academy course is published in staging.

## Endpoint under test

- `POST /api/stripe/webhook`
- Handles `checkout.session.completed` and calls `fulfillCourseFromStripeSession`.

## Test matrix

1. Happy path: successful checkout emits `checkout.session.completed` and user enrollment is created.
2. Replay/idempotency: resend same event and ensure no duplicate enrollment/payment side effects.
3. Signature failure: invalid `stripe-signature` should return `400`.
4. Missing secret: simulate missing `STRIPE_WEBHOOK_SECRET` in staging-like env and expect `503`.
5. Handler failure path: force app-side fulfillment failure and confirm Stripe retry + eventual recovery after fix.

## Execution steps

1. Trigger checkout in staging with Stripe test card.
2. Confirm event delivery in Stripe dashboard.
3. Confirm server log shows successful webhook processing.
4. Confirm enrollment/progress state was written once.
5. Replay event from Stripe dashboard and verify idempotent behavior.
6. Run invalid-signature request against staging endpoint and verify `400`.
7. Capture evidence artifacts listed below.

## Evidence log

- [ ] Stripe event ID(s):
- [ ] Checkout session ID(s):
- [ ] Staging request/response captures:
- [ ] Server log snippet for success:
- [ ] Server log snippet for retry/failed attempt:
- [ ] DB enrollment/payment verification output:
- [ ] Final verdict: PASS / FAIL

## Local preflight evidence (2026-07-02)

These checks were run against local dev endpoint to validate defensive paths before staging execution.

- Missing signature test:
  - Request: `curl -i -X POST http://localhost:3000/api/stripe/webhook`
  - Result: `400` with `{"error":"Missing stripe-signature header"}`
- Invalid signature test:
  - Request: `curl -i -X POST http://localhost:3000/api/stripe/webhook -H "stripe-signature: bad" ...`
  - Result: `400` with `{"error":"Webhook Error: Unable to extract timestamp and signatures from header"}`
- Full fulfillment + idempotency (2026-07-02):
  - Script: `npx tsx scripts/verify-stripe-webhook-reliability.ts` (with `.env.local` loaded)
  - Event: `evt_test_reliability_1783030335052` / session `cs_test_reliability_1783030335052`
  - Order: `cmr4283ma0001rxo02dcoiutz` → status `paid`, 1 payment, 1 enrollment
  - First POST: `200` `{"received":true}`
  - Replay POST (same payload): `200` `{"received":true}` — no duplicate payment/enrollment
  - Verdict: **local PASS** for happy path + idempotency

## Idempotency and retry notes

- Fulfillment idempotency is implemented in `lib/academy/stripe-fulfillment.ts`:
  - If order is already `paid`, it returns `alreadyFulfilled: true` and avoids duplicate payment/enrollment side effects.
  - Enrollment write uses `upsert` on `userId_courseId`.
- Stripe retry/failure behavior still requires staging evidence capture from real event deliveries.

## Remaining staging blockers

- Need staging URL and Stripe dashboard/test-mode access for real `checkout.session.completed` deliveries and replay.
- Need staging logs/DB visibility to attach evidence for PASS/FAIL.
- Need one real checkout-generated `checkout.session.completed` event (test mode is fine) to prove end-to-end fulfillment and replay idempotency with real metadata/order linkage.

## Notes

- If idempotency fails, block Academy public launch until fixed.
- Record root cause + fix commit hash before marking task DONE in `platform-harmonize.md`.
