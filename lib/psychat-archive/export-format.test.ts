import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PSYCHAT_ARCHIVE_EXPORT_FORMAT,
  PSYCHAT_ARCHIVE_EXPORT_VERSION,
  PSYCHAT_ARCHIVE_PURPOSE,
} from './constants'
import { parsePsychatArchiveExportFile } from './export-format'

describe('psychat-archive export format', () => {
  it('parses a valid export file', () => {
    const file = {
      format: PSYCHAT_ARCHIVE_EXPORT_FORMAT,
      version: PSYCHAT_ARCHIVE_EXPORT_VERSION,
      exportedAt: '2026-10-28T12:00:00.000Z',
      purpose: PSYCHAT_ARCHIVE_PURPOSE,
      keyVersion: 1,
      eoaAddress: '0xabc',
      keyRecipeDoc: '/docs/architecture/psychat-archive-export.md',
      snapshots: [],
    }
    const parsed = parsePsychatArchiveExportFile(JSON.stringify(file))
    assert.equal(parsed.snapshots.length, 0)
  })

  it('rejects bitácora export purpose', () => {
    const file = {
      format: PSYCHAT_ARCHIVE_EXPORT_FORMAT,
      version: PSYCHAT_ARCHIVE_EXPORT_VERSION,
      exportedAt: '2026-10-28T12:00:00.000Z',
      purpose: 'motus-safe-notes',
      keyVersion: 1,
      eoaAddress: '0xabc',
      keyRecipeDoc: '/docs/architecture/psychat-archive-export.md',
      snapshots: [],
    }
    assert.throws(() => parsePsychatArchiveExportFile(JSON.stringify(file)))
  })
})
