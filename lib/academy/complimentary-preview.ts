/**
 * Temporary review switch: Academy enrolls without Stripe.
 *
 * Prices stay in seed / DB (Praxis 15/15/15/15/40, Fundamentos 20/mes, etc.).
 * Set to `false` in prod (Oct 2026) — Stripe checkout active for paid courses.
 *
 * Not an env var on purpose — no Vercel dashboard change required.
 */
export const ACADEMY_COMPLIMENTARY_PREVIEW = false

export function isAcademyComplimentaryPreview(): boolean {
  return ACADEMY_COMPLIMENTARY_PREVIEW
}
