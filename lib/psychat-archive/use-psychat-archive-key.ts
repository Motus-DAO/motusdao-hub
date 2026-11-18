'use client'

import { useDataKeyUnlock } from '@/lib/account-data-key/use-data-key-unlock'

export function usePsychatArchiveKey() {
  return useDataKeyUnlock('psychat-archive')
}