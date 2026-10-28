'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useWallet } from '@/lib/wallet'
import { fetchAppSession } from '@/lib/auth/client'
import { useSafeNotesKey } from '@/lib/safe-notes/use-safe-notes-key'
import { useEffect } from 'react'
import {
  previewExportEntries,
  readExportFile,
  restoreExportToAccount,
} from '@/lib/safe-notes/restore-from-export'
import type { BitacoraEntryView } from '@/lib/safe-notes/client-bitacora'
import { BitacoraBackupHelp } from '@/components/bitacora/BitacoraBackupHelp'
import { ArrowLeft, FileUp, Lock } from 'lucide-react'

export default function BitacoraRecuperarPage() {
  const { ready, authenticated, login } = useWallet()
  const { isSessionReady, sessionState } = useSiweSession()
  const { eoaAddress, unlock, getKey, isUnlocked, state: keyState, unlockError } =
    useSafeNotesKey()

  const [userId, setUserId] = useState<string | null>(null)
  const [preview, setPreview] = useState<BitacoraEntryView[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoredCount, setRestoredCount] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const exportFileRef = useRef<Awaited<ReturnType<typeof readExportFile>> | null>(null)

  useEffect(() => {
    if (!isSessionReady) return
    void fetchAppSession().then((s) => {
      setUserId(s.userId)
    })
  }, [isSessionReady])

  const handleFile = async (file: File) => {
    setError(null)
    setPreview(null)
    setRestoredCount(null)
    const key = getKey()
    if (!key || !eoaAddress) {
      setError('Desbloquea la bitácora antes de elegir el archivo.')
      return
    }
    try {
      const exportFile = await readExportFile(file)
      exportFileRef.current = exportFile
      setFileName(file.name)
      const entries = await previewExportEntries(exportFile, eoaAddress, key)
      setPreview(entries)
    } catch (e) {
      exportFileRef.current = null
      setFileName(null)
      setError(e instanceof Error ? e.message : 'No se pudo abrir el archivo')
    }
  }

  const handleRestore = async () => {
    const key = getKey()
    const exportFile = exportFileRef.current
    if (!userId || !eoaAddress || !key || !exportFile) return
    setRestoring(true)
    setError(null)
    try {
      const count = await restoreExportToAccount(userId, eoaAddress, exportFile)
      setRestoredCount(count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al restaurar')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6 max-w-2xl py-12 space-y-8">
          <Link
            href="/bitacora"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Mi Bitácora
          </Link>

          <GradientText as="h1" className="text-3xl font-bold">
            Recuperar copia cifrada
          </GradientText>

          <BitacoraBackupHelp />

          {sessionState === 'needs_signature' && <SiweSessionBanner compact />}

          {sessionState === 'no_wallet' || (!authenticated && ready) ? (
            <CTAButton onClick={() => void login()}>Conectar wallet</CTAButton>
          ) : null}

          {isSessionReady && !isUnlocked && (
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-6 h-6 text-mauve-400" />
                <p className="font-medium">Desbloquea la bitácora para leer el archivo</p>
              </div>
              {unlockError && <p className="text-sm text-red-400">{unlockError}</p>}
              <CTAButton
                disabled={keyState === 'unlocking'}
                onClick={() => void unlock()}
              >
                {keyState === 'unlocking' ? 'Esperando firma…' : 'Firmar y desbloquear'}
              </CTAButton>
            </GlassCard>
          )}

          {isUnlocked && (
            <GlassCard className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Elige el archivo <strong className="text-foreground">motus-bitacora-export-….json</strong>{' '}
                que descargaste antes.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                }}
              />
              <CTAButton
                variant="secondary"
                className="w-full"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="w-5 h-5 mr-2" />
                Elegir archivo de respaldo
              </CTAButton>
              {fileName && (
                <p className="text-xs text-muted-foreground">Archivo: {fileName}</p>
              )}
            </GlassCard>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {preview && preview.length > 0 && (
            <GlassCard className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">
                Vista previa ({preview.length} entrada{preview.length === 1 ? '' : 's'})
              </h2>
              <ul className="space-y-3">
                {preview.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-white/10 p-4 text-sm"
                  >
                    <p className="text-muted-foreground text-xs mb-2">
                      {entry.createdAt.toLocaleString('es-MX')}
                    </p>
                    <p className="whitespace-pre-wrap">{entry.content}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Si borraste estas entradas en Motus, puedes volver a subir el mismo cifrado a tu
                cuenta (nuevos identificadores en el servidor).
              </p>
              <CTAButton
                glow
                disabled={restoring || !userId}
                onClick={() => void handleRestore()}
              >
                {restoring ? 'Restaurando…' : 'Restaurar en mi cuenta Motus'}
              </CTAButton>
              {restoredCount !== null && (
                <p className="text-sm text-green-400">
                  Restauradas {restoredCount} entradas.{' '}
                  <Link href="/bitacora" className="underline">
                    Abrir bitácora
                  </Link>
                </p>
              )}
            </GlassCard>
          )}

          {preview && preview.length === 0 && (
            <p className="text-muted-foreground">El archivo no tiene entradas cifradas válidas.</p>
          )}
        </div>
      </Section>
    </div>
  )
}
