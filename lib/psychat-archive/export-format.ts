import {
  PSYCHAT_ARCHIVE_EXPORT_FORMAT,
  PSYCHAT_ARCHIVE_EXPORT_VERSION,
  PSYCHAT_ARCHIVE_KEY_VERSION,
  PSYCHAT_ARCHIVE_PURPOSE,
} from './constants'

export type PsychatArchiveExportSnapshot = {
  id: string
  ciphertext: string
  iv: string
  createdAt: string
  updatedAt: string
}

export type PsychatArchiveExportFile = {
  format: typeof PSYCHAT_ARCHIVE_EXPORT_FORMAT
  version: typeof PSYCHAT_ARCHIVE_EXPORT_VERSION
  exportedAt: string
  purpose: typeof PSYCHAT_ARCHIVE_PURPOSE
  keyVersion: typeof PSYCHAT_ARCHIVE_KEY_VERSION
  eoaAddress: string
  keyRecipeDoc: '/docs/architecture/psychat-archive-export.md'
  snapshots: PsychatArchiveExportSnapshot[]
}

export function parsePsychatArchiveExportFile(json: string): PsychatArchiveExportFile {
  const parsed = JSON.parse(json) as PsychatArchiveExportFile
  if (parsed.format !== PSYCHAT_ARCHIVE_EXPORT_FORMAT) {
    throw new Error('Unsupported export format')
  }
  if (parsed.version !== PSYCHAT_ARCHIVE_EXPORT_VERSION) {
    throw new Error('Unsupported export version')
  }
  if (parsed.purpose !== PSYCHAT_ARCHIVE_PURPOSE) {
    throw new Error('Export purpose must be motus-psychat-archive')
  }
  if (!parsed.eoaAddress || !Array.isArray(parsed.snapshots)) {
    throw new Error('Invalid export file')
  }
  return parsed
}
