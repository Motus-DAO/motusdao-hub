'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { authFetch } from '@/lib/auth/client'
import { toStorageRef } from '@/lib/academy/media'
import { getPsmWizardStepBlockers } from '@/lib/intake/psm-intake-v1'
import { FileUploadField } from '@/components/ui/FileUploadField'
import { PsmSectionBlock } from '../PsmSectionBlock'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'

type Props = {
  onContinue: () => void
  onBack: () => void
}

export function PsmMediaStep({ onContinue, onBack }: Props) {
  const { data, updateData } = useOnboardingStore()
  const [showBlockers, setShowBlockers] = useState(false)

  const blockers = showBlockers ? getPsmWizardStepBlockers(2, data) : []

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    if (data.eoaAddress) formData.append('eoaAddress', data.eoaAddress)

    const res = await authFetch('/api/profile/upload-intro-video', {
      method: 'POST',
      body: formData,
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Error al subir el video')

    updateData({
      introVideoStoragePath: body.storagePath,
      introVideoUrl: toStorageRef(body.storagePath),
    })
  }

  const handleContinue = () => {
    if (!data.introVideoStoragePath) {
      setShowBlockers(true)
      return
    }
    setShowBlockers(false)
    onContinue()
  }

  return (
    <div className="space-y-8">
      {blockers.length > 0 && <PsmStepValidationBanner blockers={blockers} />}

      <PsmSectionBlock title="Video de presentación (obligatorio)">
        <p className="mb-4 text-sm text-muted-foreground">
          Graba un video de 30 a 90 segundos. Preséntate con calidez: a quién ayudas, cómo es trabajar
          contigo y qué pueden esperar. Sin este video no aparecerás en el directorio público hasta que
          el equipo lo apruebe.
        </p>

        <FileUploadField
          label="Sube tu video (MP4 o WebM, máx. 100 MB)"
          accept="video/mp4,video/webm"
          fileName={data.introVideoStoragePath ? 'intro-video' : undefined}
          onUpload={handleUpload}
          onClear={() =>
            updateData({ introVideoStoragePath: undefined, introVideoUrl: undefined })
          }
        />

        {!data.introVideoStoragePath && (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-300">
            <AlertCircle className="h-3 w-3" />
            El video es obligatorio para tu perfil público
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
