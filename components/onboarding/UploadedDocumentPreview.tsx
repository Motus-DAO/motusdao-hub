'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AlertCircle, CheckCircle, ExternalLink, FileText, Loader } from 'lucide-react'
import { fetchSignedDocumentUrl, getFileNameFromStoragePath } from '@/lib/storage-client'

type Props = {
  label: string
  storagePath: string
}

function isImageFileName(fileName: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(fileName)
}

function isPdfFileName(fileName: string): boolean {
  return /\.pdf$/i.test(fileName)
}

export function UploadedDocumentPreview({ label, storagePath }: Props) {
  const fileName = getFileNameFromStoragePath(storagePath) ?? storagePath
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchSignedDocumentUrl(storagePath)
      .then((url) => {
        if (!cancelled) setSignedUrl(url)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la vista previa')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [storagePath])

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-300">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{fileName}</span>
          </p>
        </div>
        <FileText className="h-4 w-4 shrink-0 text-mauve-400" />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader className="h-3.5 w-3.5 animate-spin" />
          Cargando vista previa…
        </div>
      )}

      {error && !loading && (
        <p className="flex items-start gap-1.5 text-xs text-amber-200/90">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {signedUrl && isImageFileName(fileName) && (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
          <Image
            src={signedUrl}
            alt={`Vista previa: ${label}`}
            width={320}
            height={240}
            className="h-40 w-full object-contain"
            unoptimized
          />
        </div>
      )}

      {signedUrl && isPdfFileName(fileName) && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-emerald-100/90">
            <FileText className="h-4 w-4 text-emerald-400" />
            <span>PDF listo para verificación</span>
          </div>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-mauve-300 hover:text-mauve-200"
          >
            Abrir
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {signedUrl && !isImageFileName(fileName) && !isPdfFileName(fileName) && (
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-mauve-300 hover:text-mauve-200"
        >
          Ver archivo
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}
