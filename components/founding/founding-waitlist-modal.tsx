'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { GradientText } from '@/components/ui/GradientText'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { useWallet, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import { FoundingMnsFields } from '@/components/founding/FoundingMnsFields'
import {
  FOUNDING_DISMISS_KEY,
  clearFoundingDraft,
  foundingWaitlistAutoOpenSuppressed,
  readFoundingDraft,
  writeFoundingDraft,
  type FoundingDraft,
  type FoundingModalStep,
  type FoundingWaitlistRole,
} from '@/lib/founding/waitlist-modal-draft'
import { getCeloExplorerUrl } from '@/lib/celo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fieldClass =
  'mt-1 w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm outline-none transition-colors focus:border-mauve-500/40'

type PublicRow = {
  position: number
  publicName: string
  mnsTxHash?: string | null
  discountPercent: number
  tier: string
  createdAt: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FoundingWaitlistModal({ open, onOpenChange }: Props) {
  const { theme, openLoginModal } = useUIStore()
  const { authenticated } = useWallet()
  const { wallets } = useWallets()
  const walletAddress = getEOAAddress(wallets)

  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<FoundingModalStep>('teaser')
  const [role, setRole] = useState<FoundingWaitlistRole>('user')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [optionalNote, setOptionalNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mnsProgress, setMnsProgress] = useState<string | null>(null)
  const [result, setResult] = useState<{ position: number; discountPercent: number } | null>(null)
  const [rows, setRows] = useState<PublicRow[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const joinInFlight = useRef(false)
  const draftJoinAttempted = useRef(false)

  useEffect(() => setMounted(true), [])

  const persistDraft = useCallback(
    (nextStep: FoundingDraft['step']) => {
      writeFoundingDraft({
        step: nextStep,
        role,
        displayName,
        email,
        optionalNote,
        mnsLabel: null,
        mnsTxHash: null,
        updatedAt: new Date().toISOString(),
      })
    },
    [role, displayName, email, optionalNote]
  )

  const loadTable = useCallback(async () => {
    setTableLoading(true)
    try {
      const res = await fetch(`/api/founding/waitlist?role=${role}&limit=50`)
      const json = (await res.json()) as { entries?: PublicRow[] }
      const entries = json.entries ?? []
      setRows(
        entries.map((e) => {
          const row = e as PublicRow & { displayName?: string }
          return {
            position: row.position,
            publicName: row.publicName || row.displayName || '—',
            mnsTxHash: row.mnsTxHash ?? null,
            discountPercent: row.discountPercent,
            tier: row.tier,
            createdAt: row.createdAt,
          }
        })
      )
    } finally {
      setTableLoading(false)
    }
  }, [role])

  useEffect(() => {
    if (open && (step === 'table' || step === 'done')) void loadTable()
  }, [open, step, loadTable, role])

  useEffect(() => {
    if (!open || step !== 'table') return
    const id = window.setInterval(() => void loadTable(), 45_000)
    return () => window.clearInterval(id)
  }, [open, step, loadTable])

  useEffect(() => {
    if (step !== 'wallet' || !authenticated || !walletAddress) return
    setStep('mns')
    persistDraft('mns')
  }, [step, authenticated, walletAddress, persistDraft])

  const joinWaitlist = useCallback(
    async (mint: { mnsLabel: string; mnsTxHash: string }) => {
      if (joinInFlight.current) return
      joinInFlight.current = true
      setError(null)
      setLoading(true)
      try {
        const res = await fetch('/api/founding/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            displayName: displayName.trim(),
            email: email.trim().toLowerCase(),
            wallet: walletAddress ?? undefined,
            mnsLabel: mint.mnsLabel,
            mnsTxHash: mint.mnsTxHash,
            optionalNote: optionalNote.trim() || undefined,
            locale: 'es',
          }),
        })
        const json = (await res.json()) as {
          error?: string
          position?: number
          discountPercent?: number
        }
        if (!res.ok) {
          setError(json.error || 'No se pudo registrar.')
          return
        }
        setResult({
          position: json.position ?? 0,
          discountPercent: json.discountPercent ?? 10,
        })
        clearFoundingDraft()
        setStep('done')
      } catch {
        setError('Error de red.')
      } finally {
        setLoading(false)
        joinInFlight.current = false
      }
    },
    [role, displayName, email, optionalNote, walletAddress]
  )

  const onMnsRegistered = useCallback(
    (payload: { mnsLabel: string; mnsTxHash: string }) => {
      void joinWaitlist(payload)
    },
    [joinWaitlist]
  )

  useEffect(() => {
    if (!open) {
      draftJoinAttempted.current = false
      return
    }
    const draft = readFoundingDraft()
    if (draft && (draft.step === 'register' || draft.step === 'wallet' || draft.step === 'mns')) {
      setRole(draft.role)
      setDisplayName(draft.displayName)
      setEmail(draft.email)
      setOptionalNote(draft.optionalNote)
      const resume =
        draft.step === 'mns' && !authenticated ? 'wallet' : (draft.step as FoundingModalStep)
      setStep(resume)
    }
  }, [open, authenticated])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (step === 'register' || step === 'wallet' || step === 'mns') {
        persistDraft(step === 'mns' ? 'mns' : step)
      }
      const blockClose = step === 'register' || step === 'wallet' || step === 'mns' || loading
      if (blockClose) return
      if (step === 'teaser') {
        try {
          localStorage.setItem(FOUNDING_DISMISS_KEY, '1')
        } catch {
          // ignore
        }
      }
      if (step !== 'done') setStep('teaser')
      setError(null)
    }
    onOpenChange(next)
  }

  const chooseRole = (next: FoundingWaitlistRole) => {
    setError(null)
    setRole(next)
    setStep('register')
  }

  const goContinueRegister = () => {
    setError(null)
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Nombre público requerido.')
      return
    }
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setError('Email válido requerido.')
      return
    }
    setStep('wallet')
    persistDraft('wallet')
  }

  const blockOutsideClose =
    step === 'register' || step === 'wallet' || step === 'mns' || loading
  const showClose = step === 'teaser' || step === 'table' || step === 'done' || step === 'role'

  if (!open || !mounted) return null

  const glassCard = cn(
    'relative w-full max-w-lg max-h-[min(640px,90svh)] overflow-y-auto overscroll-contain rounded-3xl border p-5 sm:p-7 backdrop-blur-xl backdrop-saturate-150 shadow-lg',
    theme === 'light' &&
      'border-black/10 bg-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.55)]',
    theme === 'dark' &&
      'border-white/14 bg-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
    theme === 'matrix' &&
      'rounded-none border-[var(--matrix-border)] bg-black/90 shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,65,0.1)]'
  )

  const tableShellClass = cn(
    'max-h-[min(360px,50svh)] min-h-0 overflow-y-auto overscroll-contain rounded-lg border p-2',
    theme === 'light' && 'border-black/10 bg-black/[0.03]',
    theme === 'dark' && 'border-white/10 bg-black/25',
    theme === 'matrix' && 'border-[var(--matrix-border)] bg-black/40'
  )

  const tableHeadClass = cn(
    'sticky top-0 z-10 text-xs text-muted-foreground backdrop-blur-md',
    theme === 'light' && 'bg-white/80',
    theme === 'dark' && 'bg-white/[0.06]',
    theme === 'matrix' && 'bg-black/85'
  )

  const title =
    step === 'teaser'
      ? 'Lista fundadora'
      : step === 'role'
        ? '¿Quién eres?'
        : step === 'register'
          ? 'Sé de los primeros'
          : step === 'wallet' || step === 'mns'
            ? 'Wallet y .motus'
            : 'Leaderboard'

  const content = (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!blockOutsideClose) handleOpenChange(false)
      }}
    >
      <div className={glassCard} onClick={(e) => e.stopPropagation()}>
        {showClose ? (
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="absolute right-4 top-4 rounded-xl p-2 hover:bg-foreground/10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}

        <h2 className="pr-10 text-xl font-semibold tracking-tight">
          <GradientText as="span">{title}</GradientText>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Posiciones 1–10: 50% · 11–30: 30% · 31+: 10%. Descuento en{' '}
          {role === 'user' ? 'crédito Psychat' : 'Academia'}.
        </p>

        {step === 'teaser' ? (
          <div className="mt-6 space-y-3">
            <CTAButton type="button" className="w-full" onClick={() => setStep('role')}>
              Unirme a la allowlist
            </CTAButton>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline"
              onClick={() => setStep('table')}
            >
              Ver lista pública
            </button>
          </div>
        ) : null}

        {step === 'role' ? (
          <div className="mt-6 space-y-4">
            <p className="text-center text-xs text-muted-foreground">
              Elige una opción para abrir el formulario.
            </p>
            <div className="flex gap-2">
              <CTAButton
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => chooseRole('user')}
              >
                Soy usuario
              </CTAButton>
              <CTAButton
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => chooseRole('psm')}
              >
                Soy profesional
              </CTAButton>
            </div>
            <button type="button" className="text-sm text-muted-foreground" onClick={() => setStep('teaser')}>
              Atrás
            </button>
          </div>
        ) : null}

        {step === 'register' ? (
          <div className="mt-6 space-y-4">
            <label className="block text-xs text-muted-foreground">
              Nombre público
              <input
                className={fieldClass}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Email (privado)
              <input
                type="email"
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              {role === 'user' ? '¿Qué buscas? (opcional)' : 'Especialidad o práctica (opcional)'}
              <textarea
                className={cn(fieldClass, 'min-h-[72px] resize-y')}
                value={optionalNote}
                onChange={(e) => setOptionalNote(e.target.value)}
                maxLength={500}
              />
            </label>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <CTAButton type="button" className="w-full" onClick={goContinueRegister}>
              Continuar
            </CTAButton>
            <button type="button" className="text-sm text-muted-foreground" onClick={() => setStep('role')}>
              Atrás
            </button>
          </div>
        ) : null}

        {step === 'wallet' ? (
          <div className="mt-6 space-y-4">
            <CTAButton
              type="button"
              className="w-full gap-2"
              onClick={() => void openLoginModal('founding-waitlist')}
            >
              {authenticated ? 'Sesión conectada' : 'Iniciar sesión con wallet'}
            </CTAButton>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <p className="text-[11px] text-muted-foreground text-center">
              Siguiente paso: registrar tu nombre .motus en Celo.
            </p>
            <button type="button" className="text-sm text-muted-foreground" onClick={() => setStep('register')}>
              Atrás
            </button>
          </div>
        ) : null}

        {step === 'mns' ? (
          <div className="mt-6 space-y-4">
            {loading || mnsProgress ? (
              <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mnsProgress || 'Registrando en la lista…'}
              </p>
            ) : null}
            <FoundingMnsFields
              walletAddress={walletAddress}
              disabled={loading}
              onProgress={({ message }) => setMnsProgress(message)}
              onRegistered={onMnsRegistered}
            />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        ) : null}

        {step === 'done' && result ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-green-400">
              ¡Registrado #{result.position}! Tu tier da {result.discountPercent}% de descuento cuando te
              enviemos el código.
            </p>
            <CTAButton type="button" variant="secondary" className="w-full" onClick={() => setStep('table')}>
              Ver leaderboard
            </CTAButton>
            <CTAButton type="button" className="w-full" onClick={() => handleOpenChange(false)}>
              Cerrar
            </CTAButton>
          </div>
        ) : null}

        {step === 'table' ? (
          <div className="mt-6 space-y-3">
            <div className="flex gap-2">
              <CTAButton
                type="button"
                size="sm"
                variant={role === 'user' ? 'primary' : 'secondary'}
                onClick={() => setRole('user')}
              >
                Usuarios
              </CTAButton>
              <CTAButton
                type="button"
                size="sm"
                variant={role === 'psm' ? 'primary' : 'secondary'}
                onClick={() => {
                  setRole('psm')
                }}
              >
                Profesionales
              </CTAButton>
            </div>
            {tableLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <FoundingTableShell className={tableShellClass}>
                <table className="w-full text-left text-sm">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="py-1.5 pr-2 pl-1 font-mono text-xs">#</th>
                      <th className="py-1.5 pr-2">Nombre</th>
                      <th className="py-1.5 pr-1 text-right font-heading">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.position} className="border-t border-white/5 text-sm">
                        <td className="py-1.5 pr-2 pl-1 font-mono text-xs">{row.position}</td>
                        <td className="max-w-[min(220px,42vw)] py-1.5 pr-2">
                          <FoundingMotusCell publicName={row.publicName} mnsTxHash={row.mnsTxHash} />
                        </td>
                        <td className="py-1.5 pr-1 text-right font-heading text-mauve-400">
                          {row.discountPercent}%
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-3 text-muted-foreground">
                          Sin entradas aún.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </FoundingTableShell>
            )}
            <button type="button" className="text-sm text-muted-foreground" onClick={() => setStep('teaser')}>
              Atrás
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function FoundingTableShell({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  return <div className={className}>{children}</div>
}

function FoundingMotusCell({
  publicName,
  mnsTxHash,
}: {
  publicName: string
  mnsTxHash?: string | null
}) {
  const hash = mnsTxHash?.trim()
  if (!hash) {
    return <span className="font-medium text-foreground">{publicName}</span>
  }
  const href = getCeloExplorerUrl(hash, 'tx')
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Ver transacción de registro .motus en Celo Explorer"
      className="inline-block max-w-full truncate font-medium text-mauve-400 underline decoration-mauve-400/50 underline-offset-[3px] transition-colors hover:text-mauve-300 hover:decoration-mauve-300"
    >
      {publicName}
    </a>
  )
}

export function useFoundingWaitlistPrompt(ready: boolean) {
  const setOpen = useUIStore((s) => s.setFoundingModalOpen)

  useEffect(() => {
    if (!ready) return
    if (foundingWaitlistAutoOpenSuppressed()) return

    const auto =
      process.env.NEXT_PUBLIC_FOUNDING_WAITLIST_PROMPT === 'true' ||
      process.env.NEXT_PUBLIC_FOUNDING_WAITLIST_PROMPT === '1'
    if (!auto) return

    const draft = readFoundingDraft()
    if (draft) {
      setOpen(true)
      return
    }
    try {
      if (localStorage.getItem(FOUNDING_DISMISS_KEY) === '1') return
    } catch {
      // ignore
    }
    const t = window.setTimeout(() => setOpen(true), 800)
    return () => window.clearTimeout(t)
  }, [ready, setOpen])
}
