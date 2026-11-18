import {
  ACCOUNT_DATA_KEY_VERSION,
  ACCOUNT_DATA_PURPOSE,
} from './constants'

export function buildAccountDataUnlockMessage(userId: string): string {
  const id = userId.trim()
  if (!id) {
    throw new Error('userId is required for account data unlock')
  }
  return [
    'Motus Hub — llave de datos de cuenta',
    `purpose: ${ACCOUNT_DATA_PURPOSE}`,
    `keyVersion: ${ACCOUNT_DATA_KEY_VERSION}`,
    `userId: ${id}`,
  ].join('\n')
}