export const PSM_INTRO_VIDEO_MAX_BYTES = 100 * 1024 * 1024

export const PSM_INTRO_VIDEO_MAX_LABEL = '100 MB'

const ALLOWED_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
])

export function psmIntroVideoSizeError(fileSizeBytes: number): string {
  const maxMb = PSM_INTRO_VIDEO_MAX_BYTES / (1024 * 1024)
  const fileMb = fileSizeBytes / (1024 * 1024)
  const fileLabel =
    fileMb >= 0.1 ? `${fileMb.toFixed(1)} MB` : `${Math.round(fileSizeBytes / 1024)} KB`
  return `El video pesa ${fileLabel} y supera el máximo permitido (${maxMb} MB). Comprime el archivo, acorta la duración o usa un enlace (YouTube, Vimeo, Loom).`
}

function baseMimeType(type: string): string {
  return type.split(';')[0].trim().toLowerCase()
}

function looksLikeMp4OrMov(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false
  return (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  )
}

function looksLikeWebm(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
}

export function resolvePsmIntroVideo(input: {
  type: string
  name: string
  size: number
  head: Uint8Array
}): { mime: string; ext: string } {
  if (input.size <= 0) {
    throw new Error('El archivo está vacío.')
  }
  if (input.size > PSM_INTRO_VIDEO_MAX_BYTES) {
    throw new Error(psmIntroVideoSizeError(input.size))
  }

  const declared = baseMimeType(input.type)
  const name = input.name.toLowerCase()

  if (declared === 'video/webm' || name.endsWith('.webm')) {
    if (looksLikeWebm(input.head) || declared === 'video/webm') {
      return { mime: 'video/webm', ext: 'webm' }
    }
  }

  if (
    declared === 'video/mp4' ||
    declared === 'video/quicktime' ||
    declared === 'video/x-m4v' ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov') ||
    name.endsWith('.m4v')
  ) {
    if (looksLikeMp4OrMov(input.head) || ALLOWED_MIMES.has(declared)) {
      if (declared === 'video/quicktime' || name.endsWith('.mov')) {
        return { mime: 'video/quicktime', ext: 'mov' }
      }
      return { mime: 'video/mp4', ext: 'mp4' }
    }
  }

  if (looksLikeWebm(input.head)) {
    return { mime: 'video/webm', ext: 'webm' }
  }
  if (looksLikeMp4OrMov(input.head)) {
    return { mime: 'video/mp4', ext: 'mp4' }
  }

  throw new Error(
    'Formato no compatible. Sube MP4, WebM o MOV (video de iPhone), o pega un enlace externo.'
  )
}

export function mapPsmIntroVideoUploadError(error: unknown): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : String(error)
  const message = raw.trim() || 'Error desconocido'
  const lower = message.toLowerCase()

  if (
    message.includes('supera el máximo') ||
    message.includes('Formato no compatible') ||
    message.includes('vacío')
  ) {
    return { message, status: 400 }
  }

    if (
    lower.includes('too large') ||
    lower.includes('maximum allowed size') ||
    lower.includes('payload too large') ||
    lower.includes('entity too large')
  ) {
    return {
      message: `El video es demasiado grande para el almacenamiento seguro. El tamaño máximo es ${PSM_INTRO_VIDEO_MAX_LABEL}. Comprime el archivo o usa un enlace externo.`,
      status: 400,
    }
  }

  if (
    message.includes('Not authorized') ||
    message.includes('does not match') ||
    message.includes('Authentication')
  ) {
    return { message, status: 403 }
  }

  return { message: `No se pudo guardar el video. ${message}`, status: 500 }
}
