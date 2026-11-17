'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { useWallet, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import { ONBOARDING_ROUTE } from '@/lib/onboarding-routes'

type FoundingRole = 'user' | 'psm'

type PublicEntry = {
  position: number
  displayName: string
  publicName: string
  tier: string
  discountPercent: number
}

export default function FoundingPage() {
  const [role, setRole] = useState<FoundingRole>('user')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [mnsLabel, setMnsLabel] = useState('')
  const [mnsTxHash, setMnsTxHash] = useState('')
  const [optionalNote, setOptionalNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    position: number
    tier: string
    discountPercent: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState<PublicEntry[]>([])
  const [cap, setCap] = useState(100)
  const { authenticated, login } = useWallet()
  const { wallets } = useWallets()
  const wallet = getEOAAddress(wallets)

  const loadLeaderboard = useCallback(async () => {
    const response = await fetch(`/api/founding/waitlist?role=${role}&limit=50`)
    const data = (await response.json()) as {
      entries?: PublicEntry[]
      cap?: number
    }
    setLeaderboard(data.entries ?? [])
    if (typeof data.cap === 'number') setCap(data.cap)
  }, [role])

  useEffect(() => {
    void loadLeaderboard()
  }, [loadLeaderboard])

  const submit = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const response = await fetch('/api/founding/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          displayName,
          email,
          wallet: wallet ?? undefined,
          mnsLabel,
          mnsTxHash,
          optionalNote: optionalNote || undefined,
          locale: 'es',
        }),
      })
      const data = (await response.json()) as {
        error?: string
        position?: number
        tier?: string
        discountPercent?: number
      }
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo registrar.')
      }
      setSuccess({
        position: data.position!,
        tier: data.tier!,
        discountPercent: data.discountPercent!,
      })
      void loadLeaderboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <GradientText as="h1" className="text-3xl font-bold">
          Founding allowlist
        </GradientText>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Descuento en compra (Psychat 5/10 USD o Academia de pago). No garantiza matching ni perfil
          publicado.
        </p>
      </div>
      <GlassCard className="space-y-6 p-6">
        <div className="flex gap-2">
          <CTAButton
            type="button"
            variant={role === 'user' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRole('user')}
          >
            Soy usuario
          </CTAButton>
          <CTAButton
            type="button"
            variant={role === 'psm' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRole('psm')}
          >
            Soy profesional
          </CTAButton>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Dos listas fundadoras (cap {cap} por rol). Posiciones 1–10: 50% · 11–30: 30% · 31+: 10%.
          Necesitas wallet, CELO de faucet y nombre <strong>.motus</strong> on-chain antes de enviar.
        </p>

        {!authenticated ? (
          <div className="rounded-xl border border-border/60 bg-foreground/5 p-4 text-sm">
            <p className="font-medium">Conecta tu wallet</p>
            <CTAButton type="button" size="sm" className="mt-3" onClick={() => void login()}>
              Iniciar sesión
            </CTAButton>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Wallet: {wallet ? `${wallet.slice(0, 8)}…` : '—'} ·{' '}
            <Link href={ONBOARDING_ROUTE} className="text-mauve-400 underline">
              Onboarding / MNS
            </Link>
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Nombre público
            <input
              className="mt-1 w-full rounded-xl border border-border bg-background/80 px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Email (privado)
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-border bg-background/80 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Etiqueta MNS (sin .motus)
            <input
              className="mt-1 w-full rounded-xl border border-border bg-background/80 px-3 py-2"
              value={mnsLabel}
              onChange={(e) => setMnsLabel(e.target.value)}
              placeholder="analucia"
            />
          </label>
          <label className="text-sm">
            Tx hash registro MNS
            <input
              className="mt-1 w-full rounded-xl border border-border bg-background/80 px-3 py-2 font-mono text-xs"
              value={mnsTxHash}
              onChange={(e) => setMnsTxHash(e.target.value)}
              placeholder="0x…"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Nota opcional
            <textarea
              className="mt-1 w-full rounded-xl border border-border bg-background/80 px-3 py-2"
              rows={2}
              value={optionalNote}
              onChange={(e) => setOptionalNote(e.target.value)}
            />
          </label>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {success ? (
          <p className="text-sm text-green-400">
            Registrado #{success.position} · tier {success.tier} ({success.discountPercent}%).
            Te avisaremos por email cuando enviemos tu código.
          </p>
        ) : null}

        <CTAButton type="button" disabled={loading} onClick={() => void submit()}>
          {loading ? 'Enviando…' : 'Unirme a la lista'}
        </CTAButton>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Leaderboard ({role === 'user' ? 'Usuarios' : 'PSM'})</h2>
        <ul className="space-y-2 text-sm">
          {leaderboard.map((row) => (
            <li
              key={row.position}
              className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2"
            >
              <span>
                #{row.position} · {row.publicName || row.displayName}
              </span>
              <span className="text-muted-foreground">
                {row.tier} · {row.discountPercent}%
              </span>
            </li>
          ))}
          {leaderboard.length === 0 ? (
            <li className="text-muted-foreground">Aún no hay entradas públicas.</li>
          ) : null}
        </ul>
      </GlassCard>
    </div>
  )
}