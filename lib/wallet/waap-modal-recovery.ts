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
