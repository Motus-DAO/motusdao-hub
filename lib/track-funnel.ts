import posthog from 'posthog-js'
import { trackCta } from '@/lib/track-cta'

/** Funnel steps — specs/funnel-open-market-tofu.md F4 */
export type FunnelStep =
  | 'tofu_page_view'
  | 'pwa_hint_shown'
  | 'pwa_hint_dismissed'
  | 'login_from_tofu'
  | 'human_handoff_marketplace'
  | 'credit_checkout_start'
  | 'therapy_book_start'

export function trackFunnel(
  step: FunnelStep,
  props?: Record<string, string | number | boolean | undefined>,
) {
  try {
    posthog.capture('funnel_step', { step, site: 'hub', ...props })
  } catch {
    /* analytics must not block UX */
  }
}

export function trackTofuExplore(
  label: string,
  location: string,
  href: string,
) {
  trackCta(label, { location, href, funnel: 'tofu' })
  trackFunnel('tofu_page_view', { label, href })
}