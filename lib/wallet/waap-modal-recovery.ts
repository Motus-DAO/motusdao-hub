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

const ROOT_OVERLAY_IDS = new Set([
  'waap-wallet-iframe-container',
  'silk-wallet-iframe-container',
])

/** Human Tech sets this inline. Chrome clamps it, so a tied z-index loses to DOM order. */
const SDK_OVERLAY_Z_INDEX = '9999999999'

function isRootOverlay(element: HTMLElement): boolean {
  return ROOT_OVERLAY_IDS.has(element.id)
}

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

/** True when a root wallet shell is painted and can take clicks. */
export function isWaapOverlayBlockingPage(): boolean {
  if (typeof window === 'undefined') return false
  for (const id of ROOT_OVERLAY_IDS) {
    const element = document.getElementById(id)
    if (!element) continue
    const style = window.getComputedStyle(element)
    const opacity = Number.parseFloat(style.opacity)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    if (!Number.isNaN(opacity) && opacity === 0) continue
    if (style.pointerEvents === 'none') continue
    return true
  }
  return false
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
  /**
   * Set when the iframe does not emit visual-ready and the SDK shows it anyway.
   * That path is a normal wallet modal, not a blank shell.
   */
  usedVisualFallback?: boolean
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
  // visualReadyAt stays null when the iframe does not support that signal and
  // the SDK falls back to showing the frame directly.
  if (
    diagnostics.modalPhase === 'visible' &&
    (diagnostics.visualReadyAt || diagnostics.usedVisualFallback)
  ) {
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

/**
 * True while the user is in a real wallet modal: opening, or visible and painted.
 * A shell that is idle, hidden, or blank must not keep capturing Hub clicks.
 */
export function isWaapModalHoldingInput(
  diagnostics: WaapIframeDiagnosticsLike | null | undefined,
  now = Date.now()
): boolean {
  if (!diagnostics) return false
  const phase = diagnostics.modalPhase
  if (phase !== 'pending' && phase !== 'visible') return false
  return !isWaapOverlayStuckBlank(diagnostics, now)
}

/**
 * Drop clicks on the SDK shell unless a wallet modal is actually open.
 * Keeps the SDK nodes in the DOM so the next sign-in can reuse them.
 * With no diagnostics, only a shell the browser already treats as hidden is released.
 */
export function syncWaapOverlayInput(
  diagnostics: WaapIframeDiagnosticsLike | null | undefined,
  now = Date.now()
): boolean {
  if (typeof window === 'undefined') return false
  if (isWaapModalHoldingInput(diagnostics, now)) {
    return restoreReleasedWaapOverlayInput()
  }
  if (!diagnostics) return releaseHiddenWaapOverlayInput()
  return releaseInactiveWaapOverlayInput()
}

function releaseInactiveWaapOverlayInput(): boolean {
  let released = false
  for (const element of findWaapOverlayElements()) {
    const style = window.getComputedStyle(element)
    const opacity = Number.parseFloat(style.opacity)
    const painted =
      isRootOverlay(element) &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      !Number.isNaN(opacity) &&
      opacity > 0
    const capturing = style.pointerEvents !== 'none'
    if (!capturing && !painted) continue

    if (capturing) element.style.pointerEvents = 'none'
    if (painted) {
      if (!element.dataset.waapHubZIndex) {
        element.dataset.waapHubZIndex = element.style.zIndex || SDK_OVERLAY_Z_INDEX
      }
      element.style.visibility = 'hidden'
      element.style.opacity = '0'
      element.style.zIndex = '1'
    }
    element.dataset.waapHubReleased = 'true'
    released = true
  }

  if (released) {
    console.warn('[WAAP] Released inactive wallet overlay so Hub controls can be clicked')
  }
  return released
}

function restoreReleasedWaapOverlayInput(): boolean {
  let restored = false
  for (const element of findWaapOverlayElements()) {
    if (element.dataset.waapHubReleased !== 'true') continue
    delete element.dataset.waapHubReleased
    element.style.pointerEvents = 'auto'
    if (isRootOverlay(element)) {
      element.style.visibility = 'visible'
      element.style.opacity = '1'
      element.style.zIndex = element.dataset.waapHubZIndex || SDK_OVERLAY_Z_INDEX
      delete element.dataset.waapHubZIndex
    }
    restored = true
  }

  if (restored) {
    console.warn('[WAAP] Restored wallet overlay for an active modal')
  }
  return restored
}
