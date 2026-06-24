'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { AlertCircle, CheckCircle, FileText, Loader, Upload, X } from 'lucide-react'

type FileUploadFieldProps = {
  label: string
  description?: string
  accept: string
  hint?: string
  fileName?: string
  /** Remote URL for uploaded image preview */
  previewUrl?: string
  disabled?: boolean
  onUpload: (file: File) => Promise<void>
  onClear?: () => void
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

function isImageAccept(accept: string): boolean {
  return accept.includes('image/')
}

function formatUploadError(message: string): string {
  const normalized = message.trim()
  if (normalized === 'Authentication required') {
    return 'Falta verificar tu wallet: firma el mensaje de verificación (arriba en el paso de conexión o en esta pantalla).'
  }
  if (normalized === 'No file provided') {
    return 'No se seleccionó ningún archivo.'
  }
  if (normalized === 'Error al subir el archivo') {
    return 'No se pudo subir el archivo. Intenta de nuevo.'
  }
  return normalized
}

export function FileUploadField({
  label,
  description,
  accept,
  hint,
  fileName,
  previewUrl,
  disabled = false,
  onUpload,
  onClear,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [justUploaded, setJustUploaded] = useState(false)

  const isUploaded = Boolean(fileName)

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  useEffect(() => {
    if (isUploaded) {
      setJustUploaded(true)
      setError(null)
    }
  }, [isUploaded])

  const displayPreview = localPreview || previewUrl
  const showImagePreview = Boolean(
    displayPreview && (isImageAccept(accept) || previewUrl) && (isUploading || isUploaded)
  )

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    let objectUrl: string | null = null
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }

    if (isImageFile(file)) {
      objectUrl = URL.createObjectURL(file)
      setLocalPreview(objectUrl)
    }

    setIsUploading(true)
    setError(null)
    setJustUploaded(false)

    try {
      await onUpload(file)
      setJustUploaded(true)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        setLocalPreview(null)
      }
    } catch (err) {
      const message = formatUploadError(
        err instanceof Error ? err.message : 'Error al subir el archivo'
      )
      setError(message)
      setJustUploaded(false)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        setLocalPreview(null)
      }
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleClear = () => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }
    setError(null)
    setJustUploaded(false)
    onClear?.()
  }

  const showSuccess = isUploaded && !error && !isUploading

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium">{label}</label>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploaded ? 'Reemplazar archivo' : 'Seleccionar archivo'}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || isUploading}
          onChange={handleFileChange}
        />

        {isUploading && (
          <span className="text-sm text-muted-foreground">Subiendo archivo…</span>
        )}
      </div>

      {showSuccess && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-3">
          <div className="flex min-w-0 items-start gap-2 text-sm text-emerald-100">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <p className="font-medium text-emerald-200">
                {justUploaded ? 'Documento subido correctamente' : 'Documento guardado'}
              </p>
              <p className="truncate text-emerald-300/90">{fileName}</p>
            </div>
          </div>
          {onClear && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 rounded-lg p-1.5 text-emerald-300/80 transition hover:bg-emerald-500/20 hover:text-white"
              aria-label="Quitar documento"
              title="Quitar documento"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3">
          <div className="flex min-w-0 items-start gap-2 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">No se pudo subir el archivo</p>
              <p className="text-red-200/90">{error}</p>
            </div>
          </div>
          {(localPreview || isUploaded) && onClear && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 rounded-lg p-1.5 text-red-300/80 transition hover:bg-red-500/20 hover:text-white"
              aria-label="Quitar selección"
              title="Quitar selección"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {showImagePreview && displayPreview && (
        <div className="relative inline-block overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <Image
            src={displayPreview}
            alt={`Vista previa de ${label}`}
            width={200}
            height={200}
            className="h-40 w-auto max-w-full object-contain"
            unoptimized
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {onClear && isUploaded && !isUploading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white/90 transition hover:bg-black/90"
              aria-label="Quitar imagen"
              title="Quitar documento"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {showSuccess && fileName?.match(/\.pdf$/i) && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-200/90">
          <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>PDF listo para verificación administrativa</span>
        </div>
      )}

      {hint && !showSuccess && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
