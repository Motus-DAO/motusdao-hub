'use client'

import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { MNS_PAYMENT_RESOLVE_HINT } from '@/lib/mns-ux-copy'

type MnsResolutionPreviewProps = {
  resolving?: boolean
  resolvedAddress?: string | null
  displayName?: string | null
  error?: string | null
  variant?: 'default' | 'compact'
  className?: string
}

export function MnsResolutionPreview({
  resolving,
  resolvedAddress,
  displayName,
  error,
  variant = 'default',
  className = '',
}: MnsResolutionPreviewProps) {
  if (resolving) {
    return (
      <div
        className={`flex items-center gap-2 text-xs text-blue-400 ${className}`}
        role="status"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Resolviendo destinatario…
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 ${className}`}
        role="alert"
      >
        {error}
      </div>
    )
  }

  if (!resolvedAddress) return null

  const pad = variant === 'compact' ? 'p-2' : 'p-3'

  return (
    <div
      className={`rounded-lg border border-amber-500/35 bg-amber-500/10 ${pad} ${className}`}
      data-testid="mns-resolution-preview"
    >
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-200">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
        Verifica antes de enviar
      </p>
      {displayName ? (
        <p className="text-sm font-semibold text-foreground">{displayName}</p>
      ) : null}
      <p className="mt-1 font-mono text-[11px] break-all text-foreground/90">{resolvedAddress}</p>
      <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
        {MNS_PAYMENT_RESOLVE_HINT}
      </p>
    </div>
  )
}