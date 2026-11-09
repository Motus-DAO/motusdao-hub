'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useWallet, useWallets } from '@/lib/wallet'
import { getPrimaryWallet } from '@/lib/wallet-utils'
import { motusNameService } from '@/lib/motus-name-service'
import {
  sendCELOPayment,
  sendStablecoinPayment,
  type PaymentCurrency,
  type PaymentParams,
} from '@/lib/payments'
import { getCeloExplorerUrl } from '@/lib/celo'
import type { Address } from 'viem'

type TxSuccess = { hash: string; explorerUrl: string }

export default function EnviarPage() {
  const { authenticated, login } = useWallet()
  const { wallets } = useWallets()
  const primaryWallet = getPrimaryWallet(wallets || [])
  const walletAddress = primaryWallet?.address as Address | undefined

  const [to, setTo] = useState('')
  const [toName, setToName] = useState('')
  const [amount, setAmount] = useState('')
  const [token, setToken] = useState<PaymentCurrency>('wMXN')
  const [resolved, setResolved] = useState<Address | null>(null)
  const [resolving, setResolving] = useState(false)
  const [fromName, setFromName] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [tx, setTx] = useState<TxSuccess | null>(null)

  async function resolveTo(value: string) {
    if (!value) return
    setResolving(true)
    setError('')
    setResolved(null)
    try {
      const result = await motusNameService.resolveInput(value)
      if (!result.address) {
        throw new Error(
          result.type === 'name'
            ? 'Ese nombre .motus no está registrado.'
            : 'Dirección inválida.'
        )
      }
      setResolved(result.address)
      if (result.displayName) setToName(result.displayName)
    } catch (resolveError) {
      setError(
        resolveError instanceof Error ? resolveError.message : 'No se pudo resolver el destinatario.'
      )
    } finally {
      setResolving(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rawTo = params.get('to') || ''
    const rawToken = params.get('token') || 'wMXN'
    setTo(rawTo)
    setToName(params.get('toName') || '')
    setAmount(params.get('amount') || '')
    if (['wMXN', 'USDT', 'CELO'].includes(rawToken)) {
      setToken(rawToken as PaymentCurrency)
    }
    void resolveTo(rawTo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!walletAddress) return
    let cancelled = false
    void motusNameService
      .reverseLookup(walletAddress)
      .then((name) => {
        if (!cancelled) setFromName(name ? `${name}.motus` : null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [walletAddress])

  async function sign() {
    if (!authenticated) {
      await login()
      return
    }
    if (!primaryWallet || !walletAddress) {
      setError('Conecta tu wallet para firmar.')
      return
    }
    if (!resolved) {
      setError('El destinatario no está resuelto.')
      return
    }
    const numeric = Number(amount.replace(',', '.'))
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Monto inválido.')
      return
    }

    setSending(true)
    setError('')
    try {
      const params: PaymentParams = {
        from: walletAddress,
        to: resolved,
        amount,
        currency: token,
      }
      const result =
        token === 'CELO'
          ? await sendCELOPayment(primaryWallet, params, wallets)
          : await sendStablecoinPayment(primaryWallet, params)
      if (!result.success || !result.transactionHash) {
        throw new Error(result.error || 'No se pudo enviar.')
      }
      setTx({
        hash: result.transactionHash,
        explorerUrl:
          result.explorerUrl || getCeloExplorerUrl(result.transactionHash, 'tx'),
      })
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No se pudo enviar.')
    } finally {
      setSending(false)
    }
  }

  if (tx) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <GlassCard className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-bold">Envío firmado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {amount} {token} a {toName || to}
          </p>
          <a
            href={tx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex text-sm font-semibold text-mauve-300 underline"
          >
            Ver transacción en Celo
          </a>
          <div className="mt-6">
            <Link href="/pagos" className="text-sm text-muted-foreground hover:text-foreground">
              Volver a Pagos
            </Link>
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-12">
      <GlassCard className="w-full max-w-md p-6 sm:p-8">
        <Link
          href="/pagos"
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pagos
        </Link>

        <h1 className="text-2xl font-bold">Confirmar envío</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa el destinatario y firma. Motty no mueve fondos por ti.
        </p>

        <dl className="mt-6 space-y-4 rounded-xl border border-white/10 p-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">De</dt>
            <dd className="mt-1 font-medium">{fromName || walletAddress || 'Conecta tu wallet'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Para</dt>
            <dd className="mt-1 font-medium">
              {toName || to || '—'}
              {resolved && toName && toName !== resolved ? (
                <span className="mt-1 block break-all font-mono text-xs text-muted-foreground">
                  {resolved}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Monto</dt>
            <dd className="mt-1 text-2xl font-bold text-mauve-200">
              {amount || '—'} {token}
            </dd>
          </div>
        </dl>

        {resolving && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Resolviendo destinatario…
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <CTAButton
          className="mt-6 w-full"
          onClick={() => void sign()}
          disabled={sending || resolving || !resolved || !amount}
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Firmando…
            </>
          ) : !authenticated ? (
            'Conectar wallet y firmar'
          ) : (
            'Firmar y enviar'
          )}
        </CTAButton>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Motus no custodia tus fondos. La red de Celo puede cobrar gas.
        </p>
      </GlassCard>
    </div>
  )
}
