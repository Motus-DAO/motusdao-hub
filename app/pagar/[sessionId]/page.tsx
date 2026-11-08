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

  const load = useCallback(async () => {
    try {
      const raw = (await publicClient.readContract({
        address: THERAPY_ESCROW_ADDRESS,
        abi: THERAPY_ESCROW_ABI,
        functionName: 'sessions',
        args: [sessionId],
      })) as readonly [Address, Address, Address, bigint, bigint, bigint, number, number]

      if (raw[0] === '0x0000000000000000000000000000000000000000') {
        setError('Sesión no encontrada en el escrow.')
        setSession(null)
        return
      }

      setSession({
        token: raw[0],
        patient: raw[1],
        payee: raw[2],
        amount: raw[3],
        startsAt: Number(raw[4]),
        settledAt: Number(raw[5]),
        challengeWindow: Number(raw[6]),
        status: Number(raw[7]),
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la sesión')
    } finally {
      setLoading(false)
    }
  }, [publicClient, sessionId])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 10_000)
    return () => window.clearInterval(timer)
  }, [load])

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
    if (!session || !signer) return
    setBusy(true)
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
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo depositar')
    } finally {
      setBusy(false)
    }
  }

  const settle = async () => {
    if (!session) return
    setBusy(true)
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
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar')
    } finally {
      setBusy(false)
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

              {!signer ? (
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
                  <CTAButton onClick={() => void deposit()} disabled={busy} className="w-full">
                    {busy ? 'Firmando…' : 'Aprobar y depositar'}
                  </CTAButton>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Conecta la wallet del paciente para depositar.
                  </p>
                )
              ) : session.status === 2 ? (
                isPayee ? (
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
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Depositaste. Falta que el profesional confirme la sesión.
                  </p>
                )
              ) : session.status === 3 ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-sm text-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  El agente liquida automáticamente
                </div>
              ) : session.status === 5 ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  Liquidada: {formatUnits(payeeAmount, 18)} wMXN al profesional
                </div>
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
