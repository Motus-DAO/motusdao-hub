import type { User } from '@prisma/client'
import {
  expectedStoredKeyVersion,
  resolveEffectiveDataKeyMode,
  type UserDataKeyFields,
} from './mode'

export function pickUserDataKeyFields(
  user: Pick<User, 'dataKeyMode' | 'dataKeyVersion' | 'dataKeyWalletEoa'>
): UserDataKeyFields {
  return {
    dataKeyMode: user.dataKeyMode,
    dataKeyVersion: user.dataKeyVersion,
    dataKeyWalletEoa: user.dataKeyWalletEoa,
  }
}

export function assertKeyVersionMatchesUser(
  user: UserDataKeyFields,
  keyVersion: number | undefined
): void {
  const mode = resolveEffectiveDataKeyMode(user)
  const expected = expectedStoredKeyVersion(mode)
  if (keyVersion !== undefined && keyVersion !== expected) {
    throw new Error(`Key version mismatch: expected ${expected} for mode ${mode}`)
  }
}

export function publicDataKeyPrefs(user: UserDataKeyFields) {
  const mode = resolveEffectiveDataKeyMode(user)
  return {
    dataKeyMode: mode,
    dataKeyVersion: user.dataKeyVersion,
    dataKeyWalletEoa: user.dataKeyWalletEoa,
    effectiveKeyVersion: expectedStoredKeyVersion(mode),
    isLegacy: user.dataKeyVersion < 2 || user.dataKeyMode == null,
  }
}