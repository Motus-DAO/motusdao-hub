import { useUIStore } from '@/lib/store'
import { readFoundingDraft } from '@/lib/founding/waitlist-modal-draft'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Founding waitlist already collects a private email in the Motus form (saved to DB on
 * join). Skip Human Tech's separate `requestEmail` consent when wallet login was opened
 * from that flow and the draft has a valid email — avoids a redundant modal/CAPTCHA.
 *
 * Does not apply app-wide; onboarding / Topbar still use WaaP verified email when useful.
 */
export function shouldSkipWaapVerifiedEmailShare(): boolean {
  const loginModalLocation = useUIStore.getState().loginModalLocation
  if (loginModalLocation !== 'founding-waitlist') {
    return false
  }

  const draft = readFoundingDraft()
  const email = draft?.email?.trim()
  return Boolean(email && EMAIL_RE.test(email))
}