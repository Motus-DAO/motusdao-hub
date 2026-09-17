/**
 * Legacy WaaP/Reown builds can throw non-fatal UTF-8 decode errors. Keep this
 * list deliberately narrow: transport, handshake, and configuration failures
 * must remain visible to callers and diagnostics.
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
    str.includes('strings/5.7.0')
  )
}

/** @deprecated Use isRecoverableWaapSdkError */
export const isWaaPEncodingError = isRecoverableWaapSdkError
