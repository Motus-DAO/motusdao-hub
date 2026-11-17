'use client'

import { useEffect, useState } from 'react'
import { X, Share } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  bumpPwaVisitCount,
  dismissPwaHint,
  shouldOfferPwaHint,
} from '@/lib/pwa-install'
import { trackFunnel } from '@/lib/track-funnel'

const TOFU_PATHS = ['/psychat', '/academia', '/psicoterapia', '/']

export function PwaInstallHint() {
  const [open, setOpen] = useState(false)
  const [isIosSafari, setIsIosSafari] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = window.location.pathname
    const onTofu = TOFU_PATHS.some(
      (p) => path === p || (p !== '/' && path.startsWith(`${p}/`)),
    )
    if (!onTofu) return

    bumpPwaVisitCount()
    const ua = navigator.userAgent
    setIsIosSafari(
      /iPad|iPhone|iPod/.test(ua) &&
        /Safari/i.test(ua) &&
        !/CriOS|FxiOS|EdgiOS|Chrome|Chromium/i.test(ua),
    )
    if (shouldOfferPwaHint(2)) {
      setOpen(true)
      trackFunnel('pwa_hint_shown', { path })
    }
  }, [])

  if (!open) return null

  return (
    <div
      className={cn(
        'fixed bottom-[max(5.5rem,calc(5rem+env(safe-area-inset-bottom)))] left-3 right-3 z-[90]',
        'mx-auto max-w-md rounded-2xl border border-white/15 bg-background/95 p-4 shadow-lg backdrop-blur-xl',
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Instala MotusDAO Hub</p>
          <p className="mt-1 text-muted-foreground leading-snug">
            {isIosSafari ? (
              <>
                Toca <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Compartir y luego{' '}
                <strong>Añadir a pantalla de inicio</strong> para abrir la app como un icono.
              </>
            ) : (
              <>Usa el menú del navegador → <strong>Instalar aplicación</strong> o añadir a inicio.</>
            )}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 hover:bg-foreground/10"
          aria-label="Cerrar"
          onClick={() => {
            dismissPwaHint()
            setOpen(false)
            trackFunnel('pwa_hint_dismissed')
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}