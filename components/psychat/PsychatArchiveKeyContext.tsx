'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { usePsychatArchiveKey } from '@/lib/psychat-archive/use-psychat-archive-key'

type PsychatArchiveKeyContextValue = ReturnType<typeof usePsychatArchiveKey>

const PsychatArchiveKeyContext = createContext<PsychatArchiveKeyContextValue | null>(null)

export function PsychatArchiveKeyProvider({ children }: { children: ReactNode }) {
  const value = usePsychatArchiveKey()
  return (
    <PsychatArchiveKeyContext.Provider value={value}>{children}</PsychatArchiveKeyContext.Provider>
  )
}

export function usePsychatArchiveKeyContext(): PsychatArchiveKeyContextValue {
  const ctx = useContext(PsychatArchiveKeyContext)
  if (!ctx) {
    throw new Error('usePsychatArchiveKeyContext must be used within PsychatArchiveKeyProvider')
  }
  return ctx
}
