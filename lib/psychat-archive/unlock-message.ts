import {
  PSYCHAT_ARCHIVE_KEY_VERSION,
  PSYCHAT_ARCHIVE_PURPOSE,
} from './constants'

export function buildPsychatArchiveUnlockMessage(eoaAddress: string): string {
  const address = eoaAddress.toLowerCase()
  return [
    'Motus Hub — Archivo Psychat (conversación guardada)',
    `purpose: ${PSYCHAT_ARCHIVE_PURPOSE}`,
    `keyVersion: ${PSYCHAT_ARCHIVE_KEY_VERSION}`,
    `address: ${address}`,
  ].join('\n')
}
