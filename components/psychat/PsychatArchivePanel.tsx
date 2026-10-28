'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Download,
  Loader2,
  Lock,
  LockOpen,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { CTAButton } from '@/components/ui/CTAButton'
import { psychatArchiveOptInCopy, psychatCopy } from '@/lib/psychat-archive/constants'
import { usePsychatArchiveKeyContext } from '@/components/psychat/PsychatArchiveKeyContext'
import {
  buildPsychatArchiveExportFile,
  downloadPsychatArchiveExport,
  upsertPsychatArchive,
} from '@/lib/psychat-archive/client'
import type { PsychatArchiveMessage } from '@/lib/psychat-archive/payload'
import { authFetch } from '@/lib/auth/client'

type Props = {
  isSessionReady: boolean
  messages: PsychatArchiveMessage[]
}

type ArchivePhase =
  | 'off'
  | 'needs_unlock'
  | 'unlocking'
  | 'ready'
  | 'saving'
  | 'saved'
  | 'error'

const phaseMeta: Record<
  ArchivePhase,
  {
    title: string
    hint: string
    Icon: typeof Shield
    iconClass: string
    shellClass: string
    iconWrapClass: string
    spinIcon?: boolean
  }
> = {
  off: {
    title: 'Copia cifrada apagada',
    hint: 'El chat no se respalda en tu cuenta Motus.',
    Icon: Shield,
    iconClass: 'text-muted-foreground',
    shellClass: 'border-border/80 bg-muted/20',
    iconWrapClass: 'bg-muted/40 border-border/60',
  },
  needs_unlock: {
    title: 'Copia activada — falta tu firma',
    hint: 'Firma con tu wallet para cifrar y guardar (llave distinta a la bitácora).',
    Icon: Lock,
    iconClass: 'text-amber-400',
    shellClass: 'border-amber-400/45 bg-amber-500/[0.08] shadow-[0_0_24px_-8px_rgba(251,191,36,0.35)]',
    iconWrapClass: 'bg-amber-500/15 border-amber-400/40',
  },
  unlocking: {
    title: 'Esperando firma en tu wallet…',
    hint: 'Confirma el mensaje en tu billetera.',
    Icon: Loader2,
    iconClass: 'text-amber-300',
    shellClass: 'border-amber-400/50 bg-amber-500/10',
    iconWrapClass: 'bg-amber-500/20 border-amber-400/50',
    spinIcon: true,
  },
  ready: {
    title: 'Copia cifrada activa',
    hint: 'Se actualiza sola al chatear o con “Guardar copia ahora”.',
    Icon: LockOpen,
    iconClass: 'text-emerald-400',
    shellClass:
      'border-emerald-400/40 bg-emerald-500/[0.07] shadow-[0_0_28px_-10px_rgba(52,211,153,0.35)]',
    iconWrapClass: 'bg-emerald-500/15 border-emerald-400/35',
  },
  saving: {
    title: 'Guardando en tu cuenta…',
    hint: 'Cifrando en tu navegador y enviando el sobre cerrado a Motus.',
    Icon: CloudUpload,
    iconClass: 'text-sky-400',
    shellClass: 'border-sky-400/50 bg-sky-500/10 shadow-[0_0_24px_-8px_rgba(56,189,248,0.4)]',
    iconWrapClass: 'bg-sky-500/15 border-sky-400/45',
    spinIcon: true,
  },
  saved: {
    title: 'Copia guardada',
    hint: psychatCopy.savedToAccount,
    Icon: CheckCircle2,
    iconClass: 'text-green-400',
    shellClass: 'border-green-400/45 bg-green-500/[0.08]',
    iconWrapClass: 'bg-green-500/15 border-green-400/40',
  },
  error: {
    title: 'No se pudo guardar',
    hint: 'Revisa conexión o vuelve a desbloquear el archivo.',
    Icon: AlertCircle,
    iconClass: 'text-red-400',
    shellClass: 'border-red-400/45 bg-red-500/[0.08]',
    iconWrapClass: 'bg-red-500/15 border-red-400/40',
  },
}

export function PsychatArchivePanel({ isSessionReady, messages }: Props) {
  const { theme } = useUIStore()
  const isLight = theme === 'light'
  const [optIn, setOptIn] = useState(false)
  const [loadingOptIn, setLoadingOptIn] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [exporting, setExporting] = useState(false)
  const {
    eoaAddress,
    isUnlocked,
    unlock,
    state: keyState,
    unlockError,
    getKey,
  } = usePsychatArchiveKeyContext()

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isSessionReady) {
      setOptIn(false)
      return
    }
    void authFetch('/api/consent/psychat-archive')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { consentToPsychatArchive?: boolean } | null) => {
        setOptIn(Boolean(d?.consentToPsychatArchive))
      })
      .catch(() => setOptIn(false))
  }, [isSessionReady])

  useEffect(() => {
    if (saveState !== 'saved') return
    savedResetRef.current = setTimeout(() => setSaveState('idle'), 4500)
    return () => {
      if (savedResetRef.current) clearTimeout(savedResetRef.current)
    }
  }, [saveState])

  const persistMessages = useCallback(
    async (list: PsychatArchiveMessage[]) => {
      const key = getKey()
      if (!optIn || !isUnlocked || !eoaAddress || !key || list.length === 0) return
      setSaveState('saving')
      try {
        await upsertPsychatArchive(eoaAddress, key, list)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    },
    [optIn, isUnlocked, eoaAddress, getKey]
  )

  useEffect(() => {
    if (!optIn || !isUnlocked) return
    const conversational = messages.filter((m) => m.content.trim().length > 0)
    if (conversational.length < 2) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void persistMessages(conversational)
    }, 2500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [messages, optIn, isUnlocked, persistMessages])

  const phase: ArchivePhase = useMemo(() => {
    if (!optIn) return 'off'
    if (saveState === 'saving') return 'saving'
    if (saveState === 'saved') return 'saved'
    if (saveState === 'error') return 'error'
    if (keyState === 'unlocking') return 'unlocking'
    if (!isUnlocked) return 'needs_unlock'
    return 'ready'
  }, [optIn, saveState, keyState, isUnlocked])

  const meta = phaseMeta[phase]
  const { Icon } = meta

  const toggleOptIn = async (enabled: boolean) => {
    setLoadingOptIn(true)
    try {
      const res = await authFetch('/api/consent/psychat-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error('No se pudo guardar la preferencia')
      setOptIn(enabled)
      if (!enabled) setSaveState('idle')
    } catch {
      alert('No se pudo actualizar la preferencia de archivo.')
    } finally {
      setLoadingOptIn(false)
    }
  }

  const handleExport = async () => {
    if (!eoaAddress) return
    setExporting(true)
    try {
      const file = await buildPsychatArchiveExportFile(eoaAddress)
      if (file.snapshots.length === 0) {
        alert('Aún no hay copia en tu cuenta Motus. Chatea con la opción activada o guarda manualmente.')
        return
      }
      downloadPsychatArchiveExport(file)
    } finally {
      setExporting(false)
    }
  }

  if (!isSessionReady) return null

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm transition-[border-color,background-color,box-shadow] duration-500',
        isLight ? 'shadow-sm' : '',
        meta.shellClass
      )}
      role="status"
      aria-live="polite"
      aria-label={meta.title}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
            meta.iconWrapClass
          )}
        >
          {exporting && phase === 'ready' ? (
            <Download className={cn('h-5 w-5 text-violet-400 animate-pulse')} aria-hidden />
          ) : (
            <Icon
              className={cn('h-5 w-5', meta.iconClass, meta.spinIcon && 'animate-spin')}
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-foreground leading-snug">{meta.title}</p>
          <p className="text-xs text-muted-foreground leading-snug">{meta.hint}</p>
          {exporting && phase === 'ready' && (
            <p className="text-xs text-violet-400">Descargando export .json…</p>
          )}
        </div>
      </div>

      <label className="mt-3 flex items-start gap-3 cursor-pointer border-t border-white/10 pt-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={optIn}
          disabled={loadingOptIn || saveState === 'saving'}
          onChange={(e) => void toggleOptIn(e.target.checked)}
        />
        <span className="text-xs text-muted-foreground">
          {psychatArchiveOptInCopy}{' '}
          <Link href="/psychat/archivo" className="text-mauve-400 underline whitespace-nowrap">
            Cómo funciona
          </Link>
        </span>
      </label>

      {optIn && !isUnlocked && keyState !== 'unlocking' && (
        <div className="mt-3 space-y-2">
          {unlockError && <p className="text-xs text-red-400">{unlockError}</p>}
          <CTAButton type="button" size="sm" className="w-full sm:w-auto" onClick={() => void unlock()}>
            Firmar y desbloquear copia
          </CTAButton>
        </div>
      )}

      {optIn && isUnlocked && (
        <div className="mt-3 flex flex-wrap gap-2 items-center border-t border-white/10 pt-3">
          <CTAButton
            type="button"
            size="sm"
            variant="secondary"
            disabled={saveState === 'saving'}
            onClick={() => void persistMessages(messages.filter((m) => m.content.trim()))}
          >
            {saveState === 'saving' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 inline animate-spin" />
                Guardando…
              </>
            ) : (
              'Guardar copia ahora'
            )}
          </CTAButton>
          <CTAButton
            type="button"
            size="sm"
            variant="secondary"
            disabled={exporting || saveState === 'saving'}
            onClick={() => void handleExport()}
          >
            {exporting ? 'Exportando…' : 'Exportar .json'}
          </CTAButton>
          <Link href="/psychat/archivo" className="text-xs text-mauve-400 underline">
            Ayuda
          </Link>
        </div>
      )}
    </div>
  )
}
