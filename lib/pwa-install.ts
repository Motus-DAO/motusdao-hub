/** PWA install hint — specs/funnel-open-market-tofu.md §5 */

export const PWA_HINT_DISMISS_KEY = 'motus_pwa_hint_dismissed_v1'
export const PWA_VISIT_COUNT_KEY = 'motus_pwa_visit_count_v1'

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  )
}

export function isMobileInstallCandidate(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isSafari =
    isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium/i.test(ua)
  const isChromeAndroid = isAndroid && /Chrome/i.test(ua)
  return isSafari || isChromeAndroid
}

export function readPwaVisitCount(): number {
  if (typeof localStorage === 'undefined') return 0
  const raw = localStorage.getItem(PWA_VISIT_COUNT_KEY)
  const n = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

export function bumpPwaVisitCount(): number {
  const next = readPwaVisitCount() + 1
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PWA_VISIT_COUNT_KEY, String(next))
  }
  return next
}

export function isPwaHintDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(PWA_HINT_DISMISS_KEY) === '1'
}

export function dismissPwaHint(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PWA_HINT_DISMISS_KEY, '1')
  }
}

export function shouldOfferPwaHint(minVisits = 2): boolean {
  if (typeof window === 'undefined') return false
  if (isStandaloneDisplay()) return false
  if (isPwaHintDismissed()) return false
  if (!isMobileInstallCandidate()) return false
  return readPwaVisitCount() >= minVisits
}