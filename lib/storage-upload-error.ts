import {
  PROFESSIONAL_DOCUMENT_MAX_BYTES,
  PROFESSIONAL_DOCUMENT_MAX_LABEL,
  professionalDocumentSizeError,
} from './storage-document'

/** Map server/storage errors to clear Spanish copy for document uploads. */
export function mapProfessionalDocumentUploadError(error: unknown): {
  message: string
  status: number
} {
  const raw = error instanceof Error ? error.message : String(error)
  const message = raw.trim() || 'Error desconocido'

  if (
    message.includes('supera el máximo permitido') ||
    message.includes('demasiado grande') ||
    message.toLowerCase().includes('too large') ||
    message.toLowerCase().includes('file too large')
  ) {
    return { message, status: 400 }
  }

  const sizeHint = `El tamaño máximo por archivo es ${PROFESSIONAL_DOCUMENT_MAX_LABEL}.`
  const lower = message.toLowerCase()

  if (
    lower.includes('maximum allowed size') ||
    lower.includes('exceeded the maximum') ||
    lower.includes('payload too large') ||
    lower.includes('entity too large') ||
    lower.includes('413')
  ) {
    return {
      message: `El archivo es demasiado grande para el almacenamiento seguro. ${sizeHint} Comprime el PDF o sube una foto en JPG/PNG.`,
      status: 400,
    }
  }

  if (
    message.includes('Not authorized') ||
    message.includes('does not match') ||
    message.includes('required') ||
    message.includes('Authentication')
  ) {
    return { message, status: 403 }
  }

  if (
    message.includes('Invalid') ||
    message.includes('Unsupported') ||
    message.includes('PDF') ||
    message.includes('vacío') ||
    message.includes('Sube un PDF')
  ) {
    return { message, status: 400 }
  }

  return { message: `No se pudo guardar el documento. ${message}`, status: 500 }
}

export function clientRejectOversizedProfessionalDocument(file: File): string | null {
  if (file.size <= 0) return 'El archivo está vacío.'
  if (file.size > PROFESSIONAL_DOCUMENT_MAX_BYTES) {
    return professionalDocumentSizeError(file.size)
  }
  return null
}
