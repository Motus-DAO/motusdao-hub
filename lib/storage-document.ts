export const PROFESSIONAL_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024

const IMAGE_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const PDF_ALIASES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'application/vnd.pdf',
  'application/vnd.adobe.pdf',
])

export function baseMimeType(type: string): string {
  return type.split(';')[0].trim().toLowerCase()
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mime: 'image/png', ext: 'png' }
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }
  return null
}

export function resolveProfessionalDocument(input: {
  type: string
  name: string
  size: number
  head: Uint8Array
}): { mime: string; ext: string } {
  if (input.size <= 0) {
    throw new Error('El archivo está vacío.')
  }
  if (input.size > PROFESSIONAL_DOCUMENT_MAX_BYTES) {
    throw new Error('El archivo es demasiado grande. El máximo es 20MB.')
  }

  const declared = baseMimeType(input.type)
  if (declared in IMAGE_BY_MIME && declared !== 'image/jpg') {
    return { mime: declared, ext: IMAGE_BY_MIME[declared] }
  }
  if (declared === 'image/jpg') {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }

  const name = input.name.toLowerCase()
  const unlabeled = declared === '' || declared === 'application/octet-stream'
  const claimsPdf = PDF_ALIASES.has(declared) || name.endsWith('.pdf') || unlabeled

  if (claimsPdf && looksLikePdf(input.head)) {
    return { mime: 'application/pdf', ext: 'pdf' }
  }
  if (PDF_ALIASES.has(declared) || name.endsWith('.pdf')) {
    throw new Error('El archivo dice ser PDF, pero no tiene el formato de un PDF.')
  }
  if (unlabeled) {
    const image = sniffImage(input.head)
    if (image) return image
  }

  throw new Error('Sube un PDF o una imagen JPG, PNG o WebP.')
}
