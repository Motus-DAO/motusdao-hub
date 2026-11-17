'use client'

import { useState } from 'react'
import { useWallet } from '@/lib/wallet'
import { useThirdwebFallback } from '@/lib/wallet/thirdweb-fallback-context'
import { isThirdwebFallbackEnabled } from '@/lib/wallet/config'

type Props = {
  className?: string
}

/**
 * Low-visibility alternate connect path (Thirdweb) while WaaP stays default.
 */
export function ThirdwebFallbackLink({ className }: Props) {
  const { authenticated, ready } = useWallet()
  const { enabled, connectWithThirdweb } = useThirdwebFallback()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isThirdwebFallbackEnabled() || !enabled || authenticated) {
    return null
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setError(null)
          setBusy(true)
          void connectWithThirdweb()
            .catch((err: unknown) => {
              setError(
                err instanceof Error ? err.message : 'No se pudo abrir Thirdweb'
              )
            })
            .finally(() => setBusy(false))
        }}
        className="text-[10px] leading-tight text-muted-foreground/35 hover:text-muted-foreground/60 underline-offset-2 hover:underline disabled:opacity-40"
        aria-label="Conectar wallet externa (Thirdweb)"
        title={ready ? 'Wallet alternativa (Thirdweb)' : undefined}
      >
        {busy ? 'Abriendo…' : 'o usar otra wallet'}
      </button>
      {error ? (
        <p className="mt-1 text-[10px] text-red-400/80" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}