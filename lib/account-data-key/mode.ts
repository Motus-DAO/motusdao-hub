import type { DataKeyMode as PrismaDataKeyMode } from '@prisma/client'
import {
  ACCOUNT_DATA_KEY_VERSION,
  type DataKeyMode,
  WALLET_DATA_KEY_VERSION,
} from './constants'

export type UserDataKeyFields = {
  dataKeyMode: PrismaDataKeyMode | null
  dataKeyVersion: number
  dataKeyWalletEoa: string | null
}

export function resolveEffectiveDataKeyMode(user: UserDataKeyFields): DataKeyMode {
  if (user.dataKeyVersion >= ACCOUNT_DATA_KEY_VERSION && user.dataKeyMode === 'account') {
    return 'account'
  }
  if (user.dataKeyVersion >= ACCOUNT_DATA_KEY_VERSION && user.dataKeyMode === 'wallet') {
    return 'wallet'
  }
  return 'wallet'
}

export function expectedStoredKeyVersion(mode: DataKeyMode): number {
  return mode === 'account' ? ACCOUNT_DATA_KEY_VERSION : WALLET_DATA_KEY_VERSION
}

export function isLegacyDataKeyUser(user: UserDataKeyFields): boolean {
  return user.dataKeyVersion < ACCOUNT_DATA_KEY_VERSION || user.dataKeyMode == null
}

export function userHasExplicitV2Mode(user: UserDataKeyFields): boolean {
  return (
    user.dataKeyVersion >= ACCOUNT_DATA_KEY_VERSION &&
    (user.dataKeyMode === 'account' || user.dataKeyMode === 'wallet')
  )
}

export type DataKeyAadInput =
  | { mode: 'wallet'; eoaAddress: string }
  | { mode: 'account'; userId: string }

export function dataKeyAadInput(
  mode: DataKeyMode,
  userId: string,
  eoaAddress: string
): DataKeyAadInput {
  if (mode === 'account') {
    return { mode: 'account', userId }
  }
  return { mode: 'wallet', eoaAddress }
}