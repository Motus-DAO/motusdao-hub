'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AtSign, ArrowRightLeft, Loader, MapPin, PlusCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { fetchLinkedWallets } from '@/lib/auth/link-wallet-client'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import {
  loadMotusNamesForWallets,
  type MotusNameEntry,
} from '@/lib/mns-linked-wallet-names'
import {
  MNS_ACCOUNT_VS_NAME,
  MNS_CAN_MOVE,
  MNS_ONE_NAME_ONE_PAYOUT,
} from '@/lib/mns-ux-copy'
import { MNS_CONTRACT_ADDRESS } from '@/lib/motus-name-service'
import { getCeloExplorerUrl } from '@/lib/celo'

type MotusNamesPanelProps = {
  accountMotusName?: string | null
  accountPrimaryEoa?: string | null
  smartWalletAddress?: string | null
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function MotusNamesPanel({
  accountMotusName,
  accountPrimaryEoa,
  smartWalletAddress,
}: MotusNamesPanelProps) {
  const { smartAccountAddress } = useSmartAccount()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<MotusNameEntry[]>([])
  const [sessionEoa, setSessionEoa] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const linked = await fetchLinkedWallets().catch(() => ({
        wallets: [] as { address: string }[],
        sessionEoa: null as string | null,
      }))
      setSessionEoa(linked.sessionEoa)
      const walletAddresses = [
        ...linked.wallets.map((w) => w.address),
        accountPrimaryEoa,
        smartWalletAddress,
        smartAccountAddress,
        linked.sessionEoa,
      ].filter((a): a is string => Boolean(a))

      const list = await loadMotusNamesForWallets({
        walletAddresses,
        sessionEoa: linked.sessionEoa,
        accountMotusName,
        accountPrimaryEoa,
      })
      setEntries(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los nombres')
    } finally {
      setLoading(false)
    }
  }, [
    accountMotusName,
    accountPrimaryEoa,
    smartAccountAddress,
    smartWalletAddress,
  ])

  useEffect(() => {
    void reload()
  }, [reload])

  const nftExplorer = getCeloExplorerUrl(MNS_CONTRACT_ADDRESS, 'address')

  return (
    <GlassCard className="p-6 space-y-4 border border-iris-500/25">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AtSign className="h-5 w-5 text-iris-400" />
          <h3 className="text-lg font-semibold">Tus nombres .motus</h3>
        </div>
        <CTAButton size="sm" variant="secondary" asChild>
          <Link href="/motus-names?action=register#mns-register">
            <PlusCircle className="mr-2 h-4 w-4" />
            Registrar otro nombre
          </Link>
        </CTAButton>
      </div>

      <ul className="text-sm text-muted-foreground space-y-2 list-none">
        <li>{MNS_ACCOUNT_VS_NAME}</li>
        <li>{MNS_ONE_NAME_ONE_PAYOUT}</li>
        <li>{MNS_CAN_MOVE}</li>
      </ul>

      <p className="text-xs text-muted-foreground rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        No esperes un solo .motus para todas tus wallets ni que al vincular Thirdweb heredes el
        reverse automáticamente. Cada registro es único; puedes mover el NFT entre wallets propias.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader className="h-5 w-5 animate-spin mr-2" />
          Consultando Celo…
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-iris-500/30 p-4 text-center space-y-3">
          <p className="text-sm">
            Ninguna de tus wallets vinculadas tiene reverse .motus todavía.
          </p>
          <CTAButton size="sm" asChild>
            <Link href="/motus-names?action=register#mns-register">
              Registrar nombre para esta wallet
            </Link>
          </CTAButton>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <MotusNameEntryCard
              key={`${entry.name}-${entry.walletAddress}`}
              entry={entry}
              sessionEoa={sessionEoa}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
        <CTAButton size="sm" variant="secondary" className="flex-1" asChild>
          <Link href="/motus-names?action=transfer#mns-transfer">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transferir entre mis wallets
          </Link>
        </CTAButton>
        <CTAButton size="sm" variant="secondary" className="flex-1" asChild>
          <Link href="/motus-names?action=update#mns-update">
            <MapPin className="mr-2 h-4 w-4" />
            Cambiar dónde cobro
          </Link>
        </CTAButton>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Contrato MNS:{' '}
        <a
          href={nftExplorer}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {shorten(MNS_CONTRACT_ADDRESS)}
        </a>
      </p>
    </GlassCard>
  )
}

function MotusNameEntryCard({
  entry,
  sessionEoa,
}: {
  entry: MotusNameEntry
  sessionEoa: string | null
}) {
  const walletLabel = shorten(entry.walletAddress)
  const payout = entry.payoutAddress
  const payoutMismatch =
    payout &&
    entry.walletAddress.toLowerCase() !== payout.toLowerCase()

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-bold text-iris-300">{entry.name}.motus</p>
        <div className="flex flex-wrap gap-1">
          {entry.isSessionWallet ? (
            <span className="text-[10px] rounded-full bg-mauve-500/20 px-2 py-0.5 text-mauve-200">
              Sesión actual
            </span>
          ) : null}
          {entry.source === 'account_db' ? (
            <span className="text-[10px] rounded-full bg-white/10 px-2 py-0.5 text-muted-foreground">
              Guardado en perfil
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Reverse en wallet <span className="font-mono">{walletLabel}</span>
        {sessionEoa && entry.walletAddress.toLowerCase() !== sessionEoa.toLowerCase()
          ? ' (no es la sesión de pago actual)'
          : null}
      </p>
      {payout ? (
        <div className="text-xs">
          <span className="text-muted-foreground">Cobros a este nombre van a: </span>
          <span className="font-mono break-all">{payout}</span>
          {payoutMismatch ? (
            <span className="block text-amber-400/90 mt-1">
              La dirección de cobro no coincide con esta wallet — actualízala o transfiere el NFT.
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={`/motus-names?action=update&name=${encodeURIComponent(entry.name)}#mns-update`}
          className="text-xs text-mauve-300 hover:underline"
        >
          Cambiar dónde cobro
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link
          href={`/motus-names?action=transfer&name=${encodeURIComponent(entry.name)}#mns-transfer`}
          className="text-xs text-mauve-300 hover:underline"
        >
          Transferir NFT
        </Link>
      </div>
    </div>
  )
}