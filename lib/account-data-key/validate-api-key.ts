import type { User } from '@prisma/client'
import { ACCOUNT_DATA_KEY_VERSION, WALLET_DATA_KEY_VERSION } from './constants'
import { pickUserDataKeyFields, assertKeyVersionMatchesUser } from './server'

export function validatePutKeyVersion(
  user: Pick<User, 'dataKeyMode' | 'dataKeyVersion' | 'dataKeyWalletEoa'>,
  keyVersion: number | undefined
): { ok: true; expected: number } | { ok: false; error: string } {
  const fields = pickUserDataKeyFields(user)
  try {
    assertKeyVersionMatchesUser(fields, keyVersion)
  } catch {
    const expected =
      fields.dataKeyVersion >= ACCOUNT_DATA_KEY_VERSION && fields.dataKeyMode === 'account'
        ? ACCOUNT_DATA_KEY_VERSION
        : WALLET_DATA_KEY_VERSION
    return { ok: false, error: `Unsupported key version (expected ${expected})` }
  }
  const expected =
    fields.dataKeyVersion >= ACCOUNT_DATA_KEY_VERSION && fields.dataKeyMode === 'account'
      ? ACCOUNT_DATA_KEY_VERSION
      : WALLET_DATA_KEY_VERSION
  if (keyVersion === undefined) {
    return { ok: true, expected }
  }
  return { ok: true, expected: keyVersion }
}