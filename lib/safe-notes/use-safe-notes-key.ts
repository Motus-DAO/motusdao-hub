'use client'

import { useDataKeyUnlock, type DataKeyUnlockState } from '@/lib/account-data-key/use-data-key-unlock'

export type SafeNotesKeyState = DataKeyUnlockState

export function useSafeNotesKey() {
  return useDataKeyUnlock('safe-notes')
}