'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  formatUnits,
  http,
  type Address,
  type Hex,
} from 'viem'
import { celo } from 'viem/chains'
import { toDataSuffix } from '@celo/attribution-tags'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useWallet, useWallets } from '@/lib/wallet'
import { getPrimaryWallet } from '@/lib/wallet-utils'
import { sendUnsignedEvmTx } from '@/lib/payments'
import { ensureCeloNetwork } from '@/lib/celo-waap'
import {
  ERC20_APPROVE_ABI,
  THERAPY_ESCROW_ABI,
  THERAPY_ESCROW_ADDRESS,
  WMXN_ADDRESS,
} from '@/lib/escrow/abi'

type EscrowSession = {
  token: Address
  patient: Address
  payee: Address
  amount: bigint
  startsAt: number
  settledAt: number
  challengeWindow: number
  status: number
}

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

const STATUS_LABEL: Record<number, string> = {
  0: 'Sin crear',
  1: 'Esperando depósito',
  2: 'Depositada',
  3: 'Confirmada por el profesional',
  4: 'En disputa',
  5: 'Liquidada',
  6: 'Reembolsada',
}

const STATUS_CLASS: Record<number, string> = {
  0: 'bg-slate-500/10 text-slate-300',
  1: 'bg-yellow-500/10 text-yellow-300',
  2: 'bg-mauve-500/10 text-mauve-200',
  3: 'bg-blue-500/10 text-blue-300',
  4: 'bg-red-500/10 text-red-300',
  5: 'bg-green-500/10 text-green-300',
  6: 'bg-slate-500/10 text-slate-300',
}

function short(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function formatDate(seconds: number): string {
  if (!seconds) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(seconds * 1000))
}

export default function PagarSesionPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId as Hex

  const { authenticated, login } = useWallet()
  const { wallets } = useWallets()
  const waaP = getPrimaryWallet(wallets || [])

  const [session, setSession] = useState<EscrowSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<'deposit' | 'settle' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [injected, setInjected] = useState<Address | null>(null)

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: celo,
        transport: http(process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'),
      }),
    []
  )

  const readSession = useCallback(async (): Promise<EscrowSession | null> => {
    const raw = (await publicClient.readContract({
      address: THERAPY_ESCROW_ADDRESS,
      abi: THERAPY_ESCROW_ABI,
      functionName: 'sessions',
      args: [sessionId],
    })) as readonly [Address, Address, Address, bigint, bigint, bigint, number, number]

    if (raw[0] === '0x0000000000000000000000000000000000000000') return null

    return {
      token: raw[0],
      patient: raw[1],
      payee: raw[2],
      amount: raw[3],
      startsAt: Number(raw[4]),
      settledAt: Number(raw[5]),
      challengeWindow: Number(raw[6]),
      status: Number(raw[7]),
    }
  }, [publicClient, sessionId])

  const load = useCallback(async () => {
    try {
      const next = await readSession()
      if (!next) {
        setError('Sesión no encontrada en el escrow.')
        setSession(null)
        return
      }
      setSession(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la sesión')
    } finally {
      setLoading(false)
    }
  }, [readSession])

  /**
   * The RPC can serve a stale session right after a tx. Poll until the expected
   * status lands so the action button does not reappear and invite a duplicate.
   */
  const refreshUntil = useCallback(
    async (expected: number) => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          const next = await readSession()
          if (next && next.status >= expected) {
            setSession(next)
            setError(null)
            return
          }
        } catch {
          // keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
      await load()
    },
    [readSession, load]
  )

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), pending ? 2500 : 5000)
    return () => window.clearInterval(timer)
  }, [load, pending])

  const signer = (waaP?.address as Address | undefined) || injected || null
  const isPatient =
    Boolean(signer && session) && signer!.toLowerCase() === session!.patient.toLowerCase()
  const isPayee =
    Boolean(signer && session) && signer!.toLowerCase() === session!.payee.toLowerCase()

  const connectInjected = async () => {
    const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum
    if (!eth) {
      setError('No hay wallet inyectada (Rabby/MetaMask) en este navegador.')
      return
    }
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
      await ensureCeloNetwork(eth as Parameters<typeof ensureCeloNetwork>[0])
      setInjected(accounts[0] as Address)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar la wallet')
    }
  }

  const send = async (to: Address, data: Hex): Promise<string> => {
    if (waaP) {
      const result = await sendUnsignedEvmTx(
        waaP,
        { to, data, value: '0' },
        { wait: true }
      )
      if (!result.success || !result.transactionHash) {
        throw new Error(result.error || 'No se pudo enviar la transacción')
      }
      return result.transactionHash
    }

    const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum
    if (!eth || !injected) throw new Error('Conecta una wallet para continuar.')

    await ensureCeloNetwork(eth as Parameters<typeof ensureCeloNetwork>[0])
    const code = process.env.NEXT_PUBLIC_CELO_ATTRIBUTION_CODE
    const client = createWalletClient({
      account: injected,
      chain: celo,
      transport: custom(eth as Parameters<typeof custom>[0]),
      ...(code ? { dataSuffix: toDataSuffix(code) } : {}),
    })
    const hash = await client.sendTransaction({ to, data })
    await publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  const deposit = async () => {
    if (!session || !signer || pending) return
    setBusy(true)
    setPending('deposit')
    setError(null)
    try {
      const allowance = (await publicClient.readContract({
        address: WMXN_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: 'allowance',
        args: [signer, THERAPY_ESCROW_ADDRESS],
      })) as bigint

      if (allowance < session.amount) {
        await send(
          WMXN_ADDRESS,
          encodeFunctionData({
            abi: ERC20_APPROVE_ABI,
            functionName: 'approve',
            args: [THERAPY_ESCROW_ADDRESS, session.amount],
          })
        )
      }

      const hash = await send(
        THERAPY_ESCROW_ADDRESS,
        encodeFunctionData({
          abi: THERAPY_ESCROW_ABI,
          functionName: 'deposit',
          args: [sessionId],
        })
      )
      setTxHash(hash)
      await refreshUntil(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo depositar')
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const settle = async () => {
    if (!session || pending) return
    setBusy(true)
    setPending('settle')
    setError(null)
    try {
      const hash = await send(
        THERAPY_ESCROW_ADDRESS,
        encodeFunctionData({
          abi: THERAPY_ESCROW_ABI,
          functionName: 'settle',
          args: [sessionId],
        })
      )
      setTxHash(hash)
      await refreshUntil(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar')
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const cancelEscrow = async () => {
    if (!session || !signer || pending) return
    setBusy(true)
    setPending('cancel')
    setError(null)
    try {
      const hash = await send(
        THERAPY_ESCROW_ADDRESS,
        encodeFunctionData({
          abi: THERAPY_ESCROW_ABI,
          functionName: 'cancelBeforeStart',
          args: [sessionId],
        })
      )
      setTxHash(hash)
      await refreshUntil(6)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar')
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const releaseAt = session ? session.settledAt + session.challengeWindow : 0
  const fee = session
    ? (session.amount * BigInt(1000)) / BigInt(10_000)
    : BigInt(0)
  const payeeAmount = session ? session.amount - fee : BigInt(0)

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-xl px-4">
        <div className="mb-6">
          <Link
            href="/pagos"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Pagos
          </Link>
        </div>

        <GlassCard className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Pago de sesión</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Escrow en Celo · {short(sessionId)}
              </p>
            </div>
            {session && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[session.status] ?? ''}`}
              >
                {STATUS_LABEL[session.status] ?? session.status}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-mauve-500" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : session ? (
            <>
              <div className="mb-4 rounded-xl border border-white/10 p-4">
                <p className="text-3xl font-bold">
                  {formatUnits(session.amount, 18)} wMXN
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatUnits(payeeAmount, 18)} al profesional ·{' '}
                  {formatUnits(fee, 18)} a MotusDAO
                </p>
              </div>

              <dl className="mb-5 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Paciente</dt>
                  <dd className="font-mono text-xs">{short(session.patient)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Profesional</dt>
                  <dd className="font-mono text-xs">{short(session.payee)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Inicio</dt>
                  <dd className="text-xs">{formatDate(session.startsAt)}</dd>
                </div>
                {session.status === 3 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Liberación</dt>
                    <dd className="text-xs">
                      {releaseAt <= now ? 'El agente liquida ahora' : formatDate(releaseAt)}
                    </dd>
                  </div>
                )}
              </dl>

              {pending ? (
                <div className="rounded-lg border border-mauve-500/30 bg-mauve-500/5 p-4 text-sm text-mauve-200">
                  <p className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {pending === 'deposit'
                      ? 'Procesando tu depósito…'
                      : pending === 'cancel'
                        ? 'Cancelando y recuperando…'
                        : 'Confirmando la sesión…'}
                  </p>
                  <p className="mt-1 text-xs text-mauve-200/80">
                    Firma enviada. Esperando la confirmación en Celo; no cierres esta
                    página.
                  </p>
                </div>
              ) : !signer ? (
                <div className="space-y-2">
                  <CTAButton
                    onClick={() => void (authenticated ? undefined : login())}
                    className="w-full"
                  >
                    Conectar WaaP
                  </CTAButton>
                  <button
                    type="button"
                    onClick={() => void connectInjected()}
                    className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
                  >
                    Conectar Rabby / MetaMask
                  </button>
                </div>
              ) : session.status === 1 ? (
                isPatient ? (
                  <div className="space-y-2">
                    <CTAButton
                      onClick={() => void deposit()}
                      disabled={busy}
                      className="w-full"
                    >
                      {busy ? 'Firmando…' : 'Aprobar y depositar'}
                    </CTAButton>
                    <p className="text-center text-xs text-muted-foreground">
                      Se transferirá {formatUnits(session.amount, 18)} wMXN al escrow.
                      Puedes cancelar antes del inicio y recuperar todo.
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Esta sesión todavía no tiene depósito. Conecta la wallet del
                    paciente para pagarla.
                  </p>
                )
              ) : session.status === 2 ? (
                isPayee ? (
                  <div className="space-y-2">
                    <CTAButton
                      onClick={() => void settle()}
                      disabled={busy || now < session.startsAt}
                      className="w-full"
                    >
                      {busy
                        ? 'Firmando…'
                        : now < session.startsAt
                          ? `Podrás confirmar el ${formatDate(session.startsAt)}`
                          : 'Confirmar sesión'}
                    </CTAButton>
                    <p className="text-center text-xs text-muted-foreground">
                      Al confirmar, el agente libera el 90% a tu wallet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-center text-sm text-muted-foreground">
                      Depósito recibido. Falta que el profesional confirme la sesión.
                    </p>
                    {isPatient && now < session.startsAt && (
                      <CTAButton
                        variant="secondary"
                        onClick={() => void cancelEscrow()}
                        disabled={busy}
                        className="w-full"
                      >
                        {busy
                          ? 'Cancelando…'
                          : `Cancelar y recuperar ${formatUnits(session.amount, 18)} wMXN`}
                      </CTAButton>
                    )}
                  </div>
                )
              ) : session.status === 3 ? (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    El profesional confirmó la sesión.
                  </p>
                  <p className="mt-1 text-xs text-blue-200/80">
                    El agente libera el pago automáticamente; corre cada 5 minutos.
                    Si ya pasó, actualiza el estado.
                  </p>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="mt-3 rounded-lg border border-blue-400/30 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500/10"
                  >
                    Actualizar estado
                  </button>
                </div>
              ) : session.status === 5 ? (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-sm text-green-300">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Pago liberado
                  </p>
                  <p className="mt-1 text-xs text-green-200/80">
                    {formatUnits(payeeAmount, 18)} wMXN al profesional ·{' '}
                    {formatUnits(fee, 18)} wMXN a MotusDAO
                  </p>
                  <a
                    href={`https://celoscan.io/address/${THERAPY_ESCROW_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-green-300 underline"
                  >
                    Ver escrow en Celoscan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : session.status === 4 ? (
                <p className="text-center text-sm text-red-300">
                  Sesión en disputa. El agente arbitra el reembolso.
                </p>
              ) : session.status === 6 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Sesión reembolsada al paciente.
                </p>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {STATUS_LABEL[session.status] ?? 'Estado desconocido'}
                </p>
              )}

              {txHash && (
                <a
                  href={`https://celoscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-xs text-mauve-300 underline"
                >
                  Ver transacción
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </>
          ) : null}
        </GlassCard>
      </div>
    </div>
  )
}
