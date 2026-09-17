/**
 * Best-effort recovery when Human Tech leaves a blank wallet overlay
 * (#waap-wallet-iframe-container) that blocks the app with no close button.
 */

const OVERLAY_SELECTORS = [
  '#waap-wallet-iframe-container',
  '#silk-wallet-iframe-container',
  '[id*="waap-wallet-iframe"]',
  '[id*="silk-wallet-iframe"]',
]

export function findWaapOverlayElements(): HTMLElement[] {
  if (typeof document === 'undefined') return []
  const found = new Set<HTMLElement>()
  for (const selector of OVERLAY_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      if (node instanceof HTMLElement) found.add(node)
    })
  }
  return [...found]
}

export function isWaapOverlayPresent(): boolean {
  return findWaapOverlayElements().length > 0
}

/**
 * Ensure a visually hidden SDK shell cannot keep intercepting Hub clicks.
 * Unlike dismissWaapWalletOverlay, this preserves the SDK-owned DOM and only
 * acts when computed styles already say the element is hidden.
 */
export function releaseHiddenWaapOverlayInput(): boolean {
  if (typeof window === 'undefined') return false

  let released = false
  for (const element of findWaapOverlayElements()) {
    const style = window.getComputedStyle(element)
    const opacity = Number.parseFloat(style.opacity)
    const isHidden =
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      (!Number.isNaN(opacity) && opacity === 0)

    if (isHidden && style.pointerEvents !== 'none') {
      element.style.pointerEvents = 'none'
      released = true
    }
  }

  if (released) {
    console.warn('[WAAP] Released pointer capture from hidden wallet overlay')
  }
  return released
}

/**
 * Release the root SDK backdrop after a wallet operation has definitively
 * completed or been cancelled. Call only from those terminal states.
 */
export function releaseWaapOverlayInput(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false

  let released = false
  for (const selector of [
    '#waap-wallet-iframe-container',
    '#silk-wallet-iframe-container',
  ]) {
    const element = document.querySelector<HTMLElement>(selector)
    if (element && window.getComputedStyle(element).pointerEvents !== 'none') {
      element.style.pointerEvents = 'none'
      released = true
    }
  }

  if (released) {
    console.warn('[WAAP] Released wallet overlay after completed operation')
  }
  return released
}

/**
 * Remove stuck WaaP/Silk overlay nodes so the Hub UI is usable again.
 * Does not clear the wallet session by itself — call logout separately if needed.
 */
export function dismissWaapWalletOverlay(): boolean {
  const elements = findWaapOverlayElements()
  if (elements.length === 0) return false

  for (const el of elements) {
    try {
      el.remove()
    } catch {
      el.style.display = 'none'
      el.style.pointerEvents = 'none'
    }
  }

  console.warn('[WAAP] Dismissed stuck wallet overlay node(s):', elements.length)
  return true
}

export function isEmbeddedWaapLoginMethod(
  method: string | null | undefined
): boolean {
  return method === 'waap' || method === 'human'
}

type WaapIframeDiagnosticsLike = {
  modalPhase?: 'idle' | 'pending' | 'visible' | 'hidden'
  visualReadyAt?: number | null
  modalRequestedAt?: number | null
}

/**
 * True only when the shell is up but the iframe never painted usable UI.
 * A healthy "Message signing request" modal must NOT count as stuck.
 */
export function isWaapOverlayStuckBlank(
  diagnostics: WaapIframeDiagnosticsLike | null | undefined,
  now = Date.now()
): boolean {
  if (!diagnostics) return false

  const requestedAt = diagnostics.modalRequestedAt ?? null
  const ageMs = requestedAt != null ? now - requestedAt : 0

  // Actively showing wallet UI — never treat as stuck.
  if (diagnostics.modalPhase === 'visible' && diagnostics.visualReadyAt) {
    return false
  }

  // Requested / pending for a while with no paint.
  if (
    (diagnostics.modalPhase === 'pending' || diagnostics.modalPhase === 'visible') &&
    !diagnostics.visualReadyAt &&
    ageMs >= 10_000
  ) {
    return true
  }

  return false
}
