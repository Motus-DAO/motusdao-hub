import posthog from 'posthog-js'

const SITE = 'hub'

/** Named CTA click for Marketing OS attribution. No-ops if PostHog is not loaded. */
export function trackCta(
  label: string,
  props?: { href?: string; location?: string } & Record<string, string>,
) {
  try {
    posthog.capture('cta_click', { label, site: SITE, ...props })
  } catch {
    /* Analytics must never block navigation. */
  }
}
