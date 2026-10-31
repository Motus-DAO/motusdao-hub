'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Download, FileUp } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  previewExportEntries,
  readExportFile,
  restoreExportToAccount,
} from '@/lib/safe-notes/restore-from-export'
import type { BitacoraEntryView } from '@/lib/safe-notes/client-bitacora'
import { BitacoraEntryContent } from '@/components/bitacora/BitacoraEntryContent'

type Props = {
  userId: string
  eoaAddress: string
  getKey: () => CryptoKey | null
  hasEntries: boolean
  isExporting: boolean
  onDownload: () => void
  onRestored?: () => void
}

export function BitacoraEncryptedCopyBar({
  userId,
  eoaAddress,
  getKey,
  hasEntries,
  isExporting,
  onDownload,
  onRestored,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const exportFileRef = useRef<Awaited<ReturnType<typeof readExportFile>> | null>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<BitacoraEntryView[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoredCount, setRestoredCount] = useState<number | null>(null)
  const [showUploadHint, setShowUploadHint] = useState(false)

  const openFilePicker = () => {
    setShowUploadHint(true)
    setError(null)
    setRestoredCount(null)
    fileRef.current?.click()
  }

  const handleFile = async (file: File) => {
    setError(null)
    setPreview(null)
    setRestoredCount(null)
    const key = getKey()
    if (!key) {
      setError('Desbloquea la bitácora antes de subir el archivo.')
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
    const exportFile = exportFileRef.current
    if (!exportFile) return
    setRestoring(true)
    setError(null)
    try {
      const count = await restoreExportToAccount(userId, eoaAddress, exportFile)
      setRestoredCount(count)
      onRestored?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al restaurar')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <CTAButton
          type="button"
          variant="secondary"
          size="lg"
          disabled={isExporting || !hasEntries}
          onClick={() => onDownload()}
          className="w-full sm:w-auto"
        >
          <Download className="w-5 h-5 mr-2 shrink-0" />
          {isExporting ? 'Descargando…' : 'Descargar copia cifrada'}
        </CTAButton>
        <CTAButton
          type="button"
          variant="secondary"
          size="lg"
          onClick={openFilePicker}
          className="w-full sm:w-auto"
        >
          <FileUp className="w-5 h-5 mr-2 shrink-0" />
          Subir copia guardada
        </CTAButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground max-w-2xl">
        El archivo <strong className="text-foreground font-medium">.json</strong> es tu respaldo
        cifrado en tu computadora. Para volver a leerlo, usa{' '}
        <strong className="text-foreground font-medium">Subir copia guardada</strong> con la misma
        wallet — no hace falta ir a otra pantalla.{' '}
        <Link href="/bitacora/como-funciona" className="text-mauve-400 underline">
          Más detalle
        </Link>
      </p>

      {(showUploadHint || fileName || error || preview) && (
        <GlassCard className="p-4 sm:p-5 space-y-3 min-w-0 overflow-hidden">
          {fileName && (
            <p className="text-xs text-muted-foreground truncate">Archivo: {fileName}</p>
          )}
          {error && <p className="text-sm text-red-400 break-words">{error}</p>}

          {preview && preview.length > 0 && (
            <>
              <h2 className="font-semibold text-sm">
                Vista previa ({preview.length} entrada{preview.length === 1 ? '' : 's'})
              </h2>
              <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {preview.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-white/10 p-3 text-sm min-w-0 overflow-hidden"
                  >
                    <p className="text-muted-foreground text-xs mb-2">
                      {entry.createdAt.toLocaleString('es-MX')}
                    </p>
                    <BitacoraEntryContent content={entry.content} className="mb-0 text-sm" />
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Si borraste entradas en Motus, puedes volver a subir el mismo cifrado a tu cuenta.
              </p>
              <CTAButton
                glow
                size="lg"
                disabled={restoring}
                onClick={() => void handleRestore()}
                className="w-full sm:w-auto"
              >
                {restoring ? 'Restaurando…' : 'Restaurar en mi cuenta'}
              </CTAButton>
              {restoredCount !== null && (
                <p className="text-sm text-green-400">
                  Restauradas {restoredCount} entradas. Recarga la lista arriba si no las ves aún.
                </p>
              )}
            </>
          )}

          {preview && preview.length === 0 && (
            <p className="text-sm text-muted-foreground">
              El archivo no tiene entradas cifradas válidas.
            </p>
          )}

          {!preview && !error && showUploadHint && !fileName && (
            <p className="text-sm text-muted-foreground">
              Elige el archivo <strong className="text-foreground">motus-bitacora-export-….json</strong>{' '}
              que guardaste en tu computadora.
            </p>
          )}
        </GlassCard>
      )}
    </div>
  )
}
