'use client'

import { useState } from 'react'
import { FileUploadField } from '@/components/ui/FileUploadField'
import { useOnboardingStore } from '@/lib/onboarding-store'
import {
  getFileNameFromStoragePath,
  uploadProfessionalDocument,
} from '@/lib/storage-client'
import { getPsmWizardStepBlockers } from '@/lib/intake/psm-intake-v1'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'

type Props = {
  onContinue: () => void
  onBack: () => void
}

export function PsmDocumentsStep({ onContinue, onBack }: Props) {
  const { data, updateData } = useOnboardingStore()
  const [showBlockers, setShowBlockers] = useState(false)

  const hasDocument = Boolean(data.cedulaDocumentPath || data.tituloDocumentPath)

  const uploadDocument = async (file: File, documentType: 'cedula' | 'titulo') => {
    if (!data.eoaAddress) throw new Error('Conecta tu wallet antes de subir documentos')
    const result = await uploadProfessionalDocument({
      file,
      documentType,
      eoaAddress: data.eoaAddress,
    })
    updateData(
      documentType === 'cedula'
        ? { cedulaDocumentPath: result.storagePath }
        : { tituloDocumentPath: result.storagePath }
    )
    setShowBlockers(false)
  }

  const handleContinue = () => {
    if (!hasDocument) {
      setShowBlockers(true)
      return
    }
    setShowBlockers(false)
    onContinue()
  }

  const blockers = showBlockers ? getPsmWizardStepBlockers(3, data) : []

  return (
    <div className="space-y-6">
      {blockers.length > 0 && <PsmStepValidationBanner blockers={blockers} />}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Sube tu documentación profesional para verificación. Solo visible para el equipo
        administrativo de MotusDAO.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FileUploadField
          label="Documento de cédula"
          description="PDF o imagen de tu cédula profesional."
          accept="image/jpeg,image/png,image/webp,application/pdf"
          hint="PDF o imagen. Máximo 10MB."
          fileName={getFileNameFromStoragePath(data.cedulaDocumentPath)}
          onUpload={(file) => uploadDocument(file, 'cedula')}
          onClear={() => updateData({ cedulaDocumentPath: undefined })}
        />
        <FileUploadField
          label="Documento de título"
          description="PDF o imagen de tu título universitario."
          accept="image/jpeg,image/png,image/webp,application/pdf"
          hint="PDF o imagen. Máximo 10MB."
          fileName={getFileNameFromStoragePath(data.tituloDocumentPath)}
          onUpload={(file) => uploadDocument(file, 'titulo')}
          onClear={() => updateData({ tituloDocumentPath: undefined })}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Sube al menos uno: cédula profesional o título universitario.
      </p>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="px-6 py-3 text-gray-400 hover:text-white">
          Atrás
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="px-6 py-3 rounded-xl bg-mauve-500 hover:bg-mauve-600 text-white font-medium"
        >
          Continuar a revisión
        </button>
      </div>
    </div>
  )
}
