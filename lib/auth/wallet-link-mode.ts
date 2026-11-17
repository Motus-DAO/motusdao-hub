/**
 * While linking a second wallet, the Hub cookie must stay on the session wallet
 * even if the connect UI shows a different signer (Thirdweb step-up).
 */
let linkModeDepth = 0

export function startWalletLinkMode(): void {
  linkModeDepth += 1
}

export function endWalletLinkMode(): void {
  linkModeDepth = Math.max(0, linkModeDepth - 1)
}

export function isWalletLinkModeActive(): boolean {
  return linkModeDepth > 0
}

export function resetWalletLinkMode(): void {
  linkModeDepth = 0
}