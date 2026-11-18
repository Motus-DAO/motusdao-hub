'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/lib/store'
import {
  FoundingWaitlistModal,
  useFoundingWaitlistPrompt,
} from '@/components/founding/founding-waitlist-modal'

/**
 * Lab-parity founding modal host: auto-prompt on home (optional env), force open on /founding.
 */
export function FoundingWaitlistModalHost() {
  const pathname = usePathname()
  const open = useUIStore((s) => s.foundingModalOpen)
  const setOpen = useUIStore((s) => s.setFoundingModalOpen)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useFoundingWaitlistPrompt(ready && pathname === '/')

  useEffect(() => {
    if (pathname === '/founding') setOpen(true)
  }, [pathname, setOpen])

  return <FoundingWaitlistModal open={open} onOpenChange={setOpen} />
}