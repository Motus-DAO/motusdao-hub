'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, Copy, ExternalLink, Loader, Wallet, X } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { sendUnsignedEvmTx, ensureErc20Allowance } from '@/lib/payments'
import { formatCeloAddress, getCeloExplorerUrl } from '@/lib/celo'
import { getTextileFxSwapUrl } from '@/lib/ripio/wfiat'
import {
  isTextileQuoteTooCloseToExpiry,
  isTextileWfiatLeg,
  toAtomicAmount,
  TEXTILE_LIMIT_ORDER_REACTOR,
  TEXTILE_TOKEN_ADDRESSES,
  type TextileSwapSymbol,
  type TextileUnsignedTx,
  type TextileWfiatLeg,
} from '@/lib/textile/fx'
import type { WaaPWallet } from '@/lib/wallet-utils'

type QuoteResponse = {
  mode?: 'rfq' | 'live' | 'indicative'
  venue?: string
  liveExecution?: boolean
  status?: string
  reason?: string
  sellSymbol?: TextileSwapSymbol
  buySymbol?: TextileSwapSymbol
  sellAmount?: string
  buyAmount?: string | null
  availableSellAmount?: string | null
  effectiveRateRay?: string
  hint?: string
  error?: string
}

type SwapBuildResponse = {
  fillable?: boolean
  id?: string
  claimToken?: string
  status?: string
  reason?: string
  hint?: string
  expiresAt?: string
  buyAmount?: string | null
  transactions?: {
    approval?: TextileUnsignedTx
    swap?: TextileUnsignedTx
  }
  error?: string
}

type SwapPath = 'inapp' | 'external'

type WfiatSwapPanelProps = {
  initialSellSymbol: string
  wallet: WaaPWallet | null
  walletAddress: string | null
  onClose: () => void
}

function counterpart(sell: TextileSwapSymbol, wfiat: TextileWfiatLeg): TextileSwapSymbol {
  return sell === 'USDT' ? wfiat : 'USDT'
}

export function WfiatSwapPanel({
  initialSellSymbol,
  wallet,
  walletAddress,
  onClose,
}: WfiatSwapPanelProps) {
  const wfiat: TextileWfiatLeg = isTextileWfiatLeg(initialSellSymbol)
    ? initialSellSymbol
    : 'wARS'
  const [path, setPath] = useState<SwapPath>('inapp')
  const [sellSymbol, setSellSymbol] = useState<TextileSwapSymbol>(wfiat)
  const [sellAmount, setSellAmount] = useState('')
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [executingLabel, setExecutingLabel] = useState('Firmando…')
  const [error, setError] = useState<string | null>(null)
  const [successHash, setSuccessHash] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const buySymbol = counterpart(sellSymbol, wfiat)
  const textileUrl = getTextileFxSwapUrl(wfiat)

  const loadQuote = useCallback(async () => {
    if (path !== 'inapp' || !sellAmount || Number(sellAmount) <= 0) {
      setQuote(null)
      return
    }
    if (Number(sellAmount) < 1) {
      setQuote({
        error: `El mínimo RFQ es 1 ${sellSymbol} entero.`,
        liveExecution: false,
      })
      return
    }
    setQuoting(true)
    setError(null)
    try {
      const response = await fetch('/api/textile/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellSymbol,
          buySymbol,
          sellAmount,
          address: walletAddress,
        }),
      })
      const data = (await response.json()) as QuoteResponse
      if (!response.ok && !data.buyAmount) {
        throw new Error(data.error || 'No se pudo cotizar')
      }
      setQuote(data)
    } catch (err) {
      setQuote(null)
      setError(err instanceof Error ? err.message : 'No se pudo cotizar')
    } finally {
      setQuoting(false)
    }
  }, [buySymbol, path, sellAmount, sellSymbol, walletAddress])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadQuote()
    }, 400)
    return () => window.clearTimeout(handle)
  }, [loadQuote])

  const flip = () => {
    setSellSymbol(buySymbol)
    setQuote(null)
    setSuccessHash(null)
  }

  const copyMotusAddress = async () => {
    if (!walletAddress) return
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error copiando dirección Motus:', err)
    }
  }

  const openExternalSwap = () => {
    if (!textileUrl) return
    window.open(textileUrl, '_blank', 'noopener,noreferrer')
  }

  const execute = async () => {
    if (!wallet || !walletAddress) {
      setError('Conecta tu wallet WaaP para firmar el swap en Motus.')
      return
    }
    if (!sellAmount || Number(sellAmount) < 1) {
      setError(`El mínimo RFQ es 1 ${sellSymbol} entero.`)
      return
    }

    setExecuting(true)
    setExecutingLabel('Revisando aprobación…')
    setError(null)
    setSuccessHash(null)
    try {
      const required = BigInt(toAtomicAmount(sellAmount, sellSymbol))
      const allowance = await ensureErc20Allowance({
        wallet,
        owner: walletAddress as `0x${string}`,
        token: TEXTILE_TOKEN_ADDRESSES[sellSymbol],
        spender: TEXTILE_LIMIT_ORDER_REACTOR,
        required,
      })
      if (!allowance.success) {
        throw new Error(allowance.error || 'Falló la aprobación del token')
      }

      const requestSwap = async () => {
        const response = await fetch('/api/textile/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sellSymbol,
            buySymbol,
            sellAmount,
            taker: walletAddress,
          }),
        })
        const built = (await response.json()) as SwapBuildResponse
        if (!response.ok) {
          throw new Error(built.error || built.hint || 'No se pudo armar el swap')
        }
        if (!built.fillable || !built.transactions?.swap) {
          throw new Error(built.hint || built.reason || 'Nadie cotizó este monto ahora.')
        }
        return built
      }

      setExecutingLabel('Pidiendo cotización firme…')
      let built = await requestSwap()
      if (isTextileQuoteTooCloseToExpiry(built.expiresAt)) {
        built = await requestSwap()
      }
      if (isTextileQuoteTooCloseToExpiry(built.expiresAt) || (built.expiresAt && Date.parse(built.expiresAt) <= Date.now())) {
        throw new Error('La cotización firme quedó demasiado justa (~30 s). Confirma de nuevo.')
      }

      setExecutingLabel('Firmando el swap…')
      const swapTx = built.transactions?.swap
      if (!swapTx) {
        throw new Error('Textile no devolvió la transacción de swap.')
      }
      const swap = await sendUnsignedEvmTx(wallet, swapTx, { wait: true })
      if (!swap.success || !swap.transactionHash) {
        throw new Error(swap.error || 'Falló el swap')
      }

      if (built.id && built.claimToken) {
        await fetch('/api/textile/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: built.id,
            claimToken: built.claimToken,
            txHash: swap.transactionHash,
          }),
        })
      }

      setSuccessHash(swap.transactionHash)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el swap')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#1a1224] p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar swap"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center mb-4 pr-8">
          <div className="w-10 h-10 rounded-lg bg-mauve-500/30 flex items-center justify-center mr-3">
            <ArrowLeftRight className="w-5 h-5 text-mauve-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Cambiar {wfiat} ↔ USDT</h2>
            <p className="text-xs text-muted-foreground">
              En tu wallet Motus, o con otra wallet y luego envías a tu EOA aquí.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setPath('inapp')}
            className={`rounded-xl border p-3 text-left transition-colors ${
              path === 'inapp'
                ? 'border-mauve-500 bg-mauve-500/15'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <p className="text-sm font-semibold">En Motus</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Misma wallet WaaP. Cotización firme RFQ (Textile FX v2).
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPath('external')}
            className={`rounded-xl border p-3 text-left transition-colors ${
              path === 'external'
                ? 'border-mauve-500 bg-mauve-500/15'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <p className="text-sm font-semibold">Otra wallet</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Textile FX con MetaMask u otra, luego envías a tu EOA Motus.
            </p>
          </button>
        </div>

        {path === 'external' ? (
          <div className="space-y-3">
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal pl-4">
              <li>Abre Textile FX y conecta otra wallet (no WaaP).</li>
              <li>Red Celo. Cambia {wfiat} ↔ USDT.</li>
              <li>Envía el resultado a tu EOA Motus (abajo). En Pagos usa Recibir o pega esta dirección.</li>
            </ol>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] text-muted-foreground mb-1 flex items-center">
                <Wallet className="w-3 h-3 mr-1.5" />
                Tu EOA en MotusDAO (Celo)
              </p>
              {walletAddress ? (
                <>
                  <p className="text-xs font-mono break-all">{walletAddress}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatCeloAddress(walletAddress)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyMotusAddress()}
                    className="mt-2 inline-flex items-center text-xs text-mauve-400 hover:text-mauve-300"
                  >
                    <Copy className="w-3 h-3 mr-1.5" />
                    {copied ? 'Copiada' : 'Copiar dirección'}
                  </button>
                </>
              ) : (
                <p className="text-xs text-yellow-400">Inicia sesión para ver tu dirección Motus.</p>
              )}
            </div>

            <CTAButton
              className="w-full"
              onClick={openExternalSwap}
              disabled={!textileUrl}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Textile FX
            </CTAButton>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Vendes
              <input
                type="number"
                min="0"
                value={sellAmount}
                onChange={(event) => setSellAmount(event.target.value)}
                placeholder="0.0"
                className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500/60"
              />
            </label>

            <div className="flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full text-xs border border-white/20">{sellSymbol}</span>
              <button
                type="button"
                onClick={flip}
                className="p-2 rounded-full border border-white/15 hover:border-mauve-400 text-mauve-300"
                aria-label="Invertir par"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-full text-xs border border-white/20">{buySymbol}</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              {quoting ? (
                <p className="text-muted-foreground flex items-center">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Cotizando RFQ…
                </p>
              ) : quote?.buyAmount ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recibes (est. RFQ)</p>
                  <p className="text-lg font-bold">
                    {quote.buyAmount} <span className="text-mauve-400">{buySymbol}</span>
                  </p>
                  {quote.hint && (
                    <p className="text-[11px] text-muted-foreground mt-2">{quote.hint}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    La cotización firme dura ~30 s. La aprobación del token se hace antes, para no gastar ese plazo.
                  </p>
                </div>
              ) : quote?.hint || quote?.error ? (
                <p className="text-xs text-yellow-400">{quote.hint || quote.error}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ingresa al menos 1 {sellSymbol} entero para cotizar.
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {successHash && (
              <a
                href={getCeloExplorerUrl(successHash, 'tx')}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-green-400 underline"
              >
                Swap enviado. Ver en Celo Explorer
              </a>
            )}

            <CTAButton
              className="w-full"
              onClick={() => void execute()}
              disabled={executing || quoting || !sellAmount || Number(sellAmount) < 1}
            >
              {executing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {executingLabel}
                </>
              ) : (
                `Cambiar ${sellSymbol} → ${buySymbol} en Motus`
              )}
            </CTAButton>
          </div>
        )}
      </div>
    </div>
  )
}
