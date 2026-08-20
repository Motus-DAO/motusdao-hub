'use client'

import { ArrowLeftRight } from 'lucide-react'
import { isTextileWfiatLeg } from '@/lib/textile/fx'

type TextileFxSwapCtaProps = {
  symbol: string
  compact?: boolean
  onOpen: (symbol: string) => void
}

export function TextileFxSwapCta({ symbol, compact = false, onOpen }: TextileFxSwapCtaProps) {
  if (!isTextileWfiatLeg(symbol)) return null

  return (
    <button
      type="button"
      onClick={() => onOpen(symbol)}
      className={
        compact
          ? 'inline-flex items-center text-xs text-mauve-400 hover:text-mauve-300 transition-colors'
          : 'inline-flex items-center justify-center w-full rounded-xl border border-mauve-500/40 bg-mauve-500/10 px-3 py-2 text-sm text-mauve-200 hover:bg-mauve-500/20 transition-colors'
      }
    >
      <ArrowLeftRight className={compact ? 'w-3 h-3 mr-1.5' : 'w-4 h-4 mr-2'} />
      Cambiar {symbol} ↔ USDT
    </button>
  )
}
