'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useWallet } from '@/lib/wallet'
import { usePsychatArchiveKey } from '@/lib/psychat-archive/use-psychat-archive-key'
import { useRouter } from 'next/navigation'
import {
  previewPsychatArchiveExport,
  readPsychatArchiveExportFile,
  restorePsychatExportToAccount,
} from '@/lib/psychat-archive/restore-from-export'
import { stashPsychatThreadForOpen } from '@/lib/psychat-archive/chat-session-bridge'
import { psychatCopy } from '@/lib/psychat-archive/constants'
import type { PsychatArchivePayload } from '@/lib/psychat-archive/payload'
import { ArrowLeft, FileUp, Lock } from 'lucide-react'

export default function PsychatArchivoRecuperarPage() {
  const router = useRouter()
  const { ready, authenticated, login } = useWallet()
  const { isSessionReady, sessionState } = useSiweSession()
  const { eoaAddress, unlock, getKey, isUnlocked, state: keyState, unlockError } =
    usePsychatArchiveKey()

  const [preview, setPreview] = useState<PsychatArchivePayload | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restored, setRestored] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const exportFileRef = useRef<Awaited<ReturnType<typeof readPsychatArchiveExportFile>> | null>(
    null
  )

  const handleFile = async (file: File) => {
    setError(null)
    setPreview(null)
    setRestored(false)
    const key = getKey()
    if (!key || !eoaAddress) {
      setError('Desbloquea el archivo Psychat antes de elegir el archivo.')
      return
    }
    try {
      const exportFile = await readPsychatArchiveExportFile(file)
      exportFileRef.current = exportFile
      setFileName(file.name)
      const payload = await previewPsychatArchiveExport(exportFile, eoaAddress, key)
      if (!payload) {
        setError('El archivo no contiene copias guardadas.')
        return
      }
      setPreview(payload)
    } catch (e) {
      exportFileRef.current = null
      setFileName(null)
      setError(e instanceof Error ? e.message : 'No se pudo abrir el archivo')
    }
  }

  const handleOpenInPsychat = () => {
    if (!preview?.messages.length) return
    stashPsychatThreadForOpen(preview.messages)
    router.push('/psychat')
  }

  const handleRestore = async () => {
    const exportFile = exportFileRef.current
    if (!eoaAddress || !exportFile) return
    setRestoring(true)
    setError(null)
    try {
      await restorePsychatExportToAccount(eoaAddress, exportFile)
      setRestored(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al restaurar')
    } finally {
      setRestoring(false)
    }
  }

  useEffect(() => {
    setPreview(null)
    setFileName(null)
    exportFileRef.current = null
  }, [eoaAddress])

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6 max-w-2xl py-12 space-y-8">
          <Link
            href="/psychat/archivo"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ayuda del archivo
          </Link>

          <GradientText as="h1" className="text-3xl font-bold">
            Recuperar copia Psychat
          </GradientText>
          <p className="text-sm text-muted-foreground">
            {psychatCopy.notAnotherWebsite} Aquí puedes abrir un `.json` en el chat o guardarlo otra
            vez en tu cuenta (con la casilla de copia cifrada activada en Psychat).
          </p>

          {sessionState === 'needs_signature' && <SiweSessionBanner compact />}

          {sessionState === 'no_wallet' || (!authenticated && ready) ? (
            <CTAButton onClick={() => void login()}>Conectar wallet</CTAButton>
          ) : null}

          {isSessionReady && !isUnlocked && (
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-6 h-6 text-mauve-400" />
                <p className="font-medium">Desbloquea el archivo (llave distinta a la bitácora)</p>
              </div>
              {unlockError && <p className="text-sm text-red-400">{unlockError}</p>}
              <CTAButton disabled={keyState === 'unlocking'} onClick={() => void unlock()}>
                {keyState === 'unlocking' ? 'Esperando firma…' : 'Firmar y desbloquear'}
              </CTAButton>
            </GlassCard>
          )}

          {isSessionReady && isUnlocked && (
            <GlassCard className="p-6 space-y-4">
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
              <CTAButton type="button" onClick={() => fileRef.current?.click()}>
                <FileUp className="w-4 h-4 mr-2 inline" />
                Elegir export `.json`
              </CTAButton>
              {fileName && (
                <p className="text-sm text-muted-foreground">Archivo: {fileName}</p>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              {preview && (
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {preview.messages.length} mensajes · guardado{' '}
                    {new Date(preview.savedAt).toLocaleString()}
                  </p>
                  <ul className="max-h-48 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3">
                    {preview.messages.slice(-6).map((m, i) => (
                      <li key={i}>
                        <span className="text-mauve-400">{m.role}:</span> {m.content.slice(0, 120)}
                        {m.content.length > 120 ? '…' : ''}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <CTAButton type="button" onClick={handleOpenInPsychat}>
                      Abrir en Psychat
                    </CTAButton>
                    <CTAButton
                      type="button"
                      variant="secondary"
                      disabled={restoring}
                      onClick={() => void handleRestore()}
                    >
                      {restoring ? 'Guardando…' : psychatCopy.saveToAccount}
                    </CTAButton>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Abrir en Psychat</strong> muestra el hilo en el chat.
                    <strong className="text-foreground"> {psychatCopy.saveToAccount}</strong> deja la misma
                    copia cifrada en tu cuenta para abrirla luego desde la barra lateral.
                  </p>
                  {restored && (
                    <p className="text-green-400/90">
                      {psychatCopy.savedToAccount} En Psychat → barra lateral → pulsa la copia en tu
                      cuenta para abrirla en el chat.
                    </p>
                  )}
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </Section>
    </div>
  )
}
