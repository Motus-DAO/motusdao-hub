/** Safari iOS connect routing — specs/identity-safari-connect-routing.md */

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari =
    /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium/i.test(ua)

  return isIOS && isSafari
}

export function shouldPreemptWaapWithThirdweb(): boolean {
  if (process.env.NEXT_PUBLIC_WAAP_FORCE_ON_SAFARI === 'true') {
    return false
  }
  return isIosSafari()
}

export function getDefaultLoginProvider(): 'waap' | 'thirdweb' {
  return shouldPreemptWaapWithThirdweb() ? 'thirdweb' : 'waap'
}

export type ConnectRoute =
  | 'waap'
  | 'thirdweb_preempt'
  | 'thirdweb_manual_fallback'
  | 'thirdweb_modal_choice'

export function resolveConnectRoute(
  provider: 'waap' | 'thirdweb',
  choseAlternate: boolean
): ConnectRoute {
  if (provider === 'waap') return 'waap'
  if (choseAlternate) return 'thirdweb_manual_fallback'
  if (shouldPreemptWaapWithThirdweb()) return 'thirdweb_preempt'
  return 'thirdweb_modal_choice'
}