import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildSafeNotesExportFile,
  parseSafeNotesExportFile,
  SAFE_NOTES_EXPORT_FORMAT,
} from './export-format'

describe('safe-notes export format', () => {
  it('builds and parses a v1 export', () => {
    const file = buildSafeNotesExportFile({
      eoaAddress: '0xAbCdEf0123456789012345678901234567890AbCd',
      entries: [
        {
          id: 'e1',
          ciphertext: 'YQ==',
          iv: 'AAAAAAAAAAAA',
          createdAt: '2026-10-27T00:00:00.000Z',
        },
      ],
    })
    assert.equal(file.format, SAFE_NOTES_EXPORT_FORMAT)
    assert.equal(file.eoaAddress, '0xabcdef0123456789012345678901234567890abcd')
    assert.equal(file.entries.length, 1)

    const round = parseSafeNotesExportFile(JSON.stringify(file))
    assert.deepEqual(round.entries, file.entries)
  })

  it('drops entries without iv', () => {
    const file = buildSafeNotesExportFile({
      eoaAddress: '0x1111111111111111111111111111111111111111',
      entries: [
        {
          id: 'legacy',
          ciphertext: '{}',
          iv: '',
          createdAt: new Date(),
        },
      ],
    })
    assert.equal(file.entries.length, 0)
  })
})
