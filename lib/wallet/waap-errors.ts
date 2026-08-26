/**
 * WaaP/Silk SDK throws several non-fatal errors (stale iframe sessions,
 * missing WalletConnect id, ethers UTF-8 decode). None of these should
 * blank the app via the provider error boundary.
 */
function errorToString(input: unknown): string {
  if (!input) return ''
  if (input instanceof Error) {
    return `${input.message || ''} ${input.name || ''} ${input.stack || ''}`
  }
  if (typeof input === 'object') {
    try {
      return JSON.stringify(input)
    } catch {
      return String(input)
    }
  }
  return String(input)
}

export function isRecoverableWaapSdkError(input: unknown): boolean {
  const str = errorToString(input)
  if (!str) return false

  return (
    str.includes('invalid codepoint') ||
    str.includes('missing continuation byte') ||
    str.includes('unexpected continuation byte') ||
    str.includes('strings/5.7.0') ||
    str.includes('INVALID_ARGUMENT') ||
    str.includes('Wallet ping timed out') ||
    str.includes('WalletConnect project ID not found') ||
    str.includes('Error setting custom config in Silk iframe')
  )
}

/** @deprecated Use isRecoverableWaapSdkError */
export const isWaaPEncodingError = isRecoverableWaapSdkError
