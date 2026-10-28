import {
  SAFE_NOTES_KEY_VERSION,
  SAFE_NOTES_PURPOSE,
} from './constants'

export function buildSafeNotesUnlockMessage(eoaAddress: string): string {
  const address = eoaAddress.toLowerCase()
  return [
    'Motus Hub — Bitácora (diario personal)',
    `purpose: ${SAFE_NOTES_PURPOSE}`,
    `keyVersion: ${SAFE_NOTES_KEY_VERSION}`,
    `address: ${address}`,
  ].join('\n')
}
