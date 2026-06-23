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

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const displayPreview = localPreview || previewUrl
  const showImagePreview = Boolean(displayPreview && (isImageAccept(accept) || previewUrl))

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (localPreview) URL.revokeObjectURL(localPreview)
    if (isImageFile(file)) {
      setLocalPreview(URL.createObjectURL(file))
    } else {
      setLocalPreview(null)
    }

    setIsUploading(true)
    setError(null)

    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo')
      if (localPreview) {
        URL.revokeObjectURL(localPreview)
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
    onClear?.()
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
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
          {fileName ? 'Reemplazar archivo' : 'Seleccionar archivo'}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || isUploading}
          onChange={handleFileChange}
        />

        {fileName && (
          <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sm text-emerald-300">
              {fileName.endsWith('.pdf') ? (
                <FileText className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{fileName}</span>
            </div>
            {onClear && (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground transition hover:text-white"
                aria-label="Quitar archivo"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {showImagePreview && displayPreview && (
        <div className="relative mt-2 inline-block overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <Image
            src={displayPreview}
            alt={`Vista previa de ${label}`}
            width={200}
            height={200}
            className="h-40 w-auto max-w-full object-contain"
            unoptimized
          />
          {onClear && fileName && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white/80 transition hover:bg-black/80"
              aria-label="Quitar imagen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {fileName && !showImagePreview && fileName.match(/\.(pdf|doc|docx)$/i) && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          <FileText className="h-5 w-5 shrink-0 text-mauve-400" />
          <span>Documento cargado — se guardará con tu perfil</span>
        </div>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {error && (
        <p className="flex items-center gap-1 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
