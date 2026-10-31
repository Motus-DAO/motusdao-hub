'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { usePsychatArchiveKey } from '@/lib/psychat-archive/use-psychat-archive-key'
import { authFetch } from '@/lib/auth/client'
import { notifyPsychatArchiveChanged } from '@/lib/psychat-archive/client'

type KeySlice = ReturnType<typeof usePsychatArchiveKey>

export type PsychatArchiveContextValue = KeySlice & {
  optIn: boolean
  loadingOptIn: boolean
  setArchiveOptIn: (enabled: boolean) => Promise<boolean>
}

const PsychatArchiveContext = createContext<PsychatArchiveContextValue | null>(null)

export function PsychatArchiveKeyProvider({
  children,
  isSessionReady,
}: {
  children: ReactNode
  isSessionReady: boolean
}) {
  const keySlice = usePsychatArchiveKey()
  const [optIn, setOptIn] = useState(false)
  const [loadingOptIn, setLoadingOptIn] = useState(false)

  useEffect(() => {
    if (!isSessionReady) {
      setOptIn(false)
      return
    }
    void authFetch('/api/consent/psychat-archive')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { consentToPsychatArchive?: boolean } | null) => {
        setOptIn(Boolean(d?.consentToPsychatArchive))
      })
      .catch(() => setOptIn(false))
  }, [isSessionReady])

  const setArchiveOptIn = useCallback(async (enabled: boolean): Promise<boolean> => {
    setLoadingOptIn(true)
    try {
      const res = await authFetch('/api/consent/psychat-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) {
        alert('No se pudo actualizar la preferencia de archivo.')
        return false
      }
      setOptIn(enabled)
      if (!enabled) notifyPsychatArchiveChanged()
      return true
    } catch {
      alert('No se pudo actualizar la preferencia de archivo.')
      return false
    } finally {
      setLoadingOptIn(false)
    }
  }, [])

  const value: PsychatArchiveContextValue = {
    ...keySlice,
    optIn,
    loadingOptIn,
    setArchiveOptIn,
  }

  return <PsychatArchiveContext.Provider value={value}>{children}</PsychatArchiveContext.Provider>
}

export function usePsychatArchiveKeyContext(): PsychatArchiveContextValue {
  const ctx = useContext(PsychatArchiveContext)
  if (!ctx) {
    throw new Error('usePsychatArchiveKeyContext must be used within PsychatArchiveKeyProvider')
  }
  return ctx
}
