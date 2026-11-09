'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createPublicClient, encodeFunctionData, http, parseUnits, type Address, type Hex } from 'viem'
import { celo } from 'viem/chains'
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { useWallet, useWallets } from '@/lib/wallet'
import { getPrimaryWallet } from '@/lib/wallet-utils'
import { getCeloExplorerUrl } from '@/lib/celo'
import {
  sendCELOPayment,
  sendStablecoinPayment,
  sendUnsignedEvmTx,
  type PaymentCurrency,
  type PaymentParams,
} from '@/lib/payments'
import {
  ERC20_APPROVE_ABI,
  THERAPY_ESCROW_ABI,
  THERAPY_ESCROW_ADDRESS,
  WMXN_ADDRESS,
} from '@/lib/escrow/abi'
import type { MottyAction } from '@/lib/motty/types'

const RPC = process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'

function formatDate(value?: string | null): string {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

export function MottyActionCard({ action }: { action: MottyAction }) {
  const { authenticated, login } = useWallet()
  const { wallets } = useWallets()
  const primary = getPrimaryWallet(wallets || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')

  const transfer = action.kind === 'transfer' ? action : null
  const escrow = action.kind === 'escrow' ? action : null

  async function signTransfer() {
    if (!transfer) return
    if (!authenticated) {
      await login()
      return
    }
    if (!primary) {
      setError('Conecta tu wallet para firmar.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const params: PaymentParams = {
        from: primary.address as Address,
        to: transfer.toAddress as Address,
        amount: transfer.amount,
        currency: transfer.token as PaymentCurrency,
      }
      const result =
        transfer.token === 'CELO'
          ? await sendCELOPayment(primary, params, wallets)
          : await sendStablecoinPayment(primary, params)
      if (!result.success || !result.transactionHash) {
        throw new Error(result.error || 'No se pudo enviar.')
      }
      setTxHash(result.transactionHash)
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : 'No se pudo enviar.')
    } finally {
      setBusy(false)
    }
  }

  async function signEscrow() {
    if (!escrow) return
    if (!authenticated) {
      await login()
      return
    }
    if (!primary) {
      setError('Conecta tu wallet para firmar.')
      return
    }
    if (!escrow.escrowId) {
      setError('Abre la página del depósito para firmar.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const publicClient = createPublicClient({ chain: celo, transport: http(RPC) })
      const amount = parseUnits(escrow.amountWmxn, 18)
      const allowance = (await publicClient.readContract({
        address: WMXN_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: 'allowance',
        args: [primary.address as Address, THERAPY_ESCROW_ADDRESS],
      })) as bigint

      if (allowance < amount) {
        const approval = await sendUnsignedEvmTx(
          primary,
          {
            to: WMXN_ADDRESS,
            data: encodeFunctionData({
              abi: ERC20_APPROVE_ABI,
              functionName: 'approve',
              args: [THERAPY_ESCROW_ADDRESS, amount],
            }),
            value: '0',
          },
          { wait: true }
        )
        if (!approval.success) throw new Error(approval.error || 'No se pudo aprobar wMXN.')
      }

      const deposit = await sendUnsignedEvmTx(
        primary,
        {
          to: THERAPY_ESCROW_ADDRESS,
          data: encodeFunctionData({
            abi: THERAPY_ESCROW_ABI,
            functionName: 'deposit',
            args: [escrow.escrowId as Hex],
          }),
          value: '0',
        },
        { wait: true }
      )
      if (!deposit.success || !deposit.transactionHash) {
        throw new Error(deposit.error || 'No se pudo depositar.')
      }
      setTxHash(deposit.transactionHash)
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : 'No se pudo depositar.')
    } finally {
      setBusy(false)
    }
  }

  if (txHash) {
    return (
      <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
        <p className="flex items-center gap-1.5 font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {transfer ? 'Envío firmado' : 'Depósito firmado'}
        </p>
        <a
          href={getCeloExplorerUrl(txHash, 'tx')}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 underline"
        >
          Ver en Celoscan <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-white/15 bg-white/[0.04] p-3 text-xs">
      {transfer ? (
        <>
          <p className="font-semibold text-foreground">
            {transfer.toName || transfer.toAddress}
          </p>
          <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
            {transfer.toAddress}
          </p>
          <p className="mt-2 text-sm font-bold text-mauve-200">
            {transfer.amount} {transfer.token}
          </p>
        </>
      ) : escrow ? (
        <>
          <p className="font-semibold text-foreground">
            {escrow.psmName ? `Sesión con ${escrow.psmName}` : 'Depósito de sesión'}
          </p>
          {escrow.startsAt ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDate(escrow.startsAt)}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-bold text-mauve-200">
            {escrow.amountWmxn} wMXN
          </p>
        </>
      ) : null}

      {error ? <p className="mt-2 text-[11px] text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={() => void (transfer ? signTransfer() : signEscrow())}
        disabled={busy}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-mauve-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Firmando…
          </>
        ) : transfer ? (
          'Firmar y enviar'
        ) : (
          'Depositar'
        )}
      </button>

      {action.kind === 'escrow' && action.payPath ? (
        <Link
          href={action.payPath}
          className="ml-2 inline-flex text-[11px] text-muted-foreground underline"
        >
          Ver página
        </Link>
      ) : null}
    </div>
  )
}
