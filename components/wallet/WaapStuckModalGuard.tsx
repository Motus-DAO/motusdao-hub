'use client'

import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  dismissWaapWalletOverlay,
  isWaapOverlayPresent,
} from '@/lib/wallet/waap-modal-recovery'

const STUCK_AFTER_MS = 12_000
const POLL_MS = 1_500

/**
 * When the Human Tech iframe shell stays up with no usable UI, offer an escape
 * hatch so users are not forced to clear cookies.
 */
export function WaapStuckModalGuard() {
  const [showEscape, setShowEscape] = useState(false)
  const [seenAt, setSeenAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | undefined

    const syncFromDiagnostics = async () => {
      try {
        const { getWaaPIframeDiagnostics, subscribeWaaPIframeLifecycle } =
          await import('@human.tech/waap-sdk')

        if (cancelled) return

        unsub = subscribeWaaPIframeLifecycle((event) => {
          if (event.phase === 'modal_requested') {
            setSeenAt((prev) => prev ?? Date.now())
          }
          if (
            event.phase === 'modal_hidden' ||
            event.phase === 'modal_cancelled'
          ) {
            setSeenAt(null)
            setShowEscape(false)
          }
          if (event.phase === 'modal_visible') {
            const diagnostics = getWaaPIframeDiagnostics()
            // Visible but never painted → treat as potentially stuck.
            if (!diagnostics.visualReadyAt) {
              setSeenAt((prev) => prev ?? Date.now())
            } else {
              setSeenAt(null)
              setShowEscape(false)
            }
          }
        })
      } catch {
        // Older/broken SDK — fall back to DOM polling only.
      }
    }

    void syncFromDiagnostics()

    const poll = window.setInterval(() => {
      const present = isWaapOverlayPresent()
      if (!present) {
        setSeenAt(null)
        setShowEscape(false)
        return
      }

      setSeenAt((prev) => {
        const started = prev ?? Date.now()
        if (Date.now() - started >= STUCK_AFTER_MS) {
          setShowEscape(true)
        }
        return started
      })
    }, POLL_MS)

    return () => {
      cancelled = true
      unsub?.()
      window.clearInterval(poll)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    dismissWaapWalletOverlay()
    setShowEscape(false)
    setSeenAt(null)
  }, [])

  if (!showEscape) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-[100000] flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-2 rounded-xl border border-amber-400/40 bg-[#1a1224]/95 p-3 shadow-2xl backdrop-blur-md">
      <p className="text-sm text-amber-50">
        El modal de wallet parece bloqueado. Puedes cerrarlo y reintentar el
        inicio de sesión.
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500/90 px-3 py-2 text-sm font-medium text-black hover:bg-amber-400"
      >
        <X className="h-4 w-4" />
        Cerrar modal de wallet
      </button>
    </div>
  )
}
