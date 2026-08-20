/**
 * Temporary review switch: Academy enrolls without Stripe.
 *
 * Prices stay in seed / DB (Praxis 15/15/15/15/40, Fundamentos 20/mes, etc.).
 * Flip this to `false`, commit, and deploy to restore checkout.
 *
 * Not an env var on purpose — no Vercel dashboard change required.
 */
export const ACADEMY_COMPLIMENTARY_PREVIEW = true

export function isAcademyComplimentaryPreview(): boolean {
  return ACADEMY_COMPLIMENTARY_PREVIEW
}
