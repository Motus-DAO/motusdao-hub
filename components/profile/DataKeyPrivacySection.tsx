'use client'

import { useDataKeyUnlock } from '@/lib/account-data-key/use-data-key-unlock'
import { DataKeyPrivacyPanel } from './DataKeyPrivacyPanel'

type Props = {
  userId: string
  eoaAddress: string | null
}

export function DataKeyPrivacySection({ userId, eoaAddress }: Props) {
  const {
    prefs,
    prefsLoading,
    effectiveMode,
    getKey,
    isUnlocked,
    unlock,
    refreshPrefs,
  } = useDataKeyUnlock('safe-notes')

  return (
    <DataKeyPrivacyPanel
      userId={userId}
      eoaAddress={eoaAddress}
      prefs={prefs}
      prefsLoading={prefsLoading}
      effectiveMode={effectiveMode}
      getKey={getKey}
      isUnlocked={isUnlocked}
      unlock={unlock}
      onPrefsChange={refreshPrefs}
    />
  )
}