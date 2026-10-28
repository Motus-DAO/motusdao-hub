'use client'

import { useState } from 'react'
import { AlertCircle, Link2 } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { isStorageMediaRef, toStorageRef } from '@/lib/academy/media'
import { uploadPsmIntroVideoDirect } from '@/lib/storage-client'
import {
  PSM_INTRO_VIDEO_MAX_BYTES,
  PSM_INTRO_VIDEO_MAX_LABEL,
  psmIntroVideoSizeError,
} from '@/lib/storage-intro-video'
import { FileUploadField } from '@/components/ui/FileUploadField'
import { inputFieldClass } from '@/lib/onboarding-form-helpers'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { PsmSectionBlock } from '../PsmSectionBlock'

type Props = {
  onContinue: () => void
  onBack: () => void
}

function isExternalVideoUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function resolveExternalVideoUrl(data: {
  introVideoUrl?: string
  introVideoStoragePath?: string
}): string {
  if (data.introVideoStoragePath) return ''
  if (data.introVideoUrl && !isStorageMediaRef(data.introVideoUrl)) {
    return data.introVideoUrl
  }
  return ''
}

function validateIntroVideoFile(file: File): string | null {
  if (file.size <= 0) return 'El archivo está vacío.'
  if (file.size > PSM_INTRO_VIDEO_MAX_BYTES) {
    return psmIntroVideoSizeError(file.size)
  }
  return null
}

export function PsmMediaStep({ onContinue, onBack }: Props) {
  const { data, updateData } = useOnboardingStore()
  const [videoUrlInput, setVideoUrlInput] = useState(() => resolveExternalVideoUrl(data))
  const [urlError, setUrlError] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    if (!data.eoaAddress) {
      throw new Error('Conecta y verifica tu wallet antes de subir el video')
    }

    const result = await uploadPsmIntroVideoDirect({
      file,
      eoaAddress: data.eoaAddress,
    })

    setVideoUrlInput('')
    setUrlError(null)
    updateData({
      introVideoStoragePath: result.storagePath,
      introVideoUrl: result.introVideoUrl || toStorageRef(result.storagePath),
    })
  }

  const handleUrlBlur = () => {
    const trimmed = videoUrlInput.trim()
    if (!trimmed) {
      setUrlError(null)
      if (!data.introVideoStoragePath) {
        updateData({ introVideoUrl: undefined })
      }
      return
    }

    if (!isExternalVideoUrl(trimmed)) {
      setUrlError('Introduce una URL válida que empiece con https://')
      return
    }

    setUrlError(null)
    updateData({
      introVideoUrl: trimmed,
      introVideoStoragePath: undefined,
    })
  }

  const handleContinue = () => {
    const trimmed = videoUrlInput.trim()
    if (trimmed && !isExternalVideoUrl(trimmed)) {
      setUrlError('Introduce una URL válida que empiece con https://')
      return
    }

    if (trimmed && !data.introVideoStoragePath) {
      updateData({
        introVideoUrl: trimmed,
        introVideoStoragePath: undefined,
      })
    }

    setUrlError(null)
    onContinue()
  }

  const hasUploadedVideo = Boolean(data.introVideoStoragePath)

  return (
    <div className="space-y-8">
      <PsmSectionBlock title="Video de presentación (opcional)">
        <SiweSessionBanner />

        <p className="mb-4 text-sm text-muted-foreground">
          Graba un video de 30 a 90 segundos o comparte un enlace (YouTube, Vimeo, Loom, etc.).
          Preséntate con calidez: a quién ayudas, cómo es trabajar contigo y qué pueden esperar.
          Puedes completar tu registro sin video y añadirlo después; con video tu perfil puede destacar más vs. los que no lo tienen.
        </p>

        <FileUploadField
          label={`Sube tu video (MP4, WebM o MOV — máx. ${PSM_INTRO_VIDEO_MAX_LABEL})`}
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov"
          hint={`La subida va directo al almacenamiento seguro; en móvil puede tardar unos minutos. Máximo ${PSM_INTRO_VIDEO_MAX_LABEL}.`}
          validateFile={validateIntroVideoFile}
          uploadingHint="Subiendo video… no cierres esta pantalla."
          fileName={hasUploadedVideo ? 'intro-video' : undefined}
          onUpload={handleUpload}
          onClear={() => {
            setVideoUrlInput('')
            setUrlError(null)
            updateData({ introVideoStoragePath: undefined, introVideoUrl: undefined })
          }}
        />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-background px-3 text-muted-foreground">o pega un enlace</span>
          </div>
        </div>

        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="intro-video-url">
          Enlace al video
        </label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="intro-video-url"
            type="url"
            inputMode="url"
            placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
            value={videoUrlInput}
            disabled={hasUploadedVideo}
            onChange={(event) => {
              setVideoUrlInput(event.target.value)
              if (urlError) setUrlError(null)
            }}
            onBlur={handleUrlBlur}
            className={inputFieldClass(Boolean(urlError), 'pl-10')}
          />
        </div>
        {urlError && (
          <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="h-3 w-3" />
            {urlError}
          </p>
        )}
        {hasUploadedVideo && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ya subiste un archivo. Bórralo si prefieres usar solo un enlace.
          </p>
        )}
      </PsmSectionBlock>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="px-6 py-3 text-gray-400 hover:text-white">
          Atrás
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="rounded-xl bg-mauve-500 px-6 py-3 font-medium text-white hover:bg-mauve-600"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
