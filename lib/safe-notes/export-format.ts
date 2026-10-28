import {
  SAFE_NOTES_KEY_VERSION,
  SAFE_NOTES_PURPOSE,
} from './constants'

/** Public on-disk / download format — see docs/architecture/safe-notes-export.md */
export const SAFE_NOTES_EXPORT_FORMAT = 'motus-safe-notes-export' as const
export const SAFE_NOTES_EXPORT_VERSION = 1 as const

export type SafeNotesExportEntry = {
  id: string
  ciphertext: string
  iv: string
  createdAt: string
  updatedAt: string
}

export type SafeNotesExportFile = {
  format: typeof SAFE_NOTES_EXPORT_FORMAT
  version: typeof SAFE_NOTES_EXPORT_VERSION
  exportedAt: string
  purpose: typeof SAFE_NOTES_PURPOSE
  keyVersion: typeof SAFE_NOTES_KEY_VERSION
  /** Lowercased EOA used as AES-GCM AAD when entries were written */
  eoaAddress: string
  keyRecipeDoc: '/docs/architecture/safe-notes-export.md'
  entries: SafeNotesExportEntry[]
}

export function buildSafeNotesExportFile(input: {
  eoaAddress: string
  entries: Array<{
    id: string
    ciphertext: string
    iv: string
    createdAt: Date | string
    updatedAt?: Date | string
  }>
}): SafeNotesExportFile {
  const eoa = input.eoaAddress.toLowerCase()
  return {
    format: SAFE_NOTES_EXPORT_FORMAT,
    version: SAFE_NOTES_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    purpose: SAFE_NOTES_PURPOSE,
    keyVersion: SAFE_NOTES_KEY_VERSION,
    eoaAddress: eoa,
    keyRecipeDoc: '/docs/architecture/safe-notes-export.md',
    entries: input.entries
      .filter((e) => e.iv && e.ciphertext)
      .map((e) => ({
        id: e.id,
        ciphertext: e.ciphertext,
        iv: e.iv,
        createdAt:
          typeof e.createdAt === 'string' ? e.createdAt : e.createdAt.toISOString(),
        updatedAt:
          typeof (e.updatedAt ?? e.createdAt) === 'string'
            ? String(e.updatedAt ?? e.createdAt)
            : new Date(e.updatedAt ?? e.createdAt).toISOString(),
      })),
  }
}

export function parseSafeNotesExportFile(json: string): SafeNotesExportFile {
  const parsed = JSON.parse(json) as SafeNotesExportFile
  if (parsed.format !== SAFE_NOTES_EXPORT_FORMAT) {
    throw new Error('Unsupported export format')
  }
  if (parsed.version !== SAFE_NOTES_EXPORT_VERSION) {
    throw new Error('Unsupported export version')
  }
  if (parsed.purpose !== SAFE_NOTES_PURPOSE) {
    throw new Error('Export purpose must be motus-safe-notes')
  }
  if (!parsed.eoaAddress || !Array.isArray(parsed.entries)) {
    throw new Error('Invalid export file')
  }
  return parsed
}

export function downloadSafeNotesExport(file: SafeNotesExportFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const stamp = file.exportedAt.slice(0, 10)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `motus-bitacora-export-${stamp}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
