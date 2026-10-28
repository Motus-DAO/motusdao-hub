import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { looksLikePdf, PROFESSIONAL_DOCUMENT_MAX_BYTES, resolveProfessionalDocument } from './storage-document'

const PDF = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])

describe('professional document upload', () => {
  it('accepts a PDF when the phone omits the MIME type', () => {
    assert.equal(looksLikePdf(PDF), true)
    const resolved = resolveProfessionalDocument({
      type: '',
      name: 'cedula.pdf',
      size: 120_000,
      head: PDF,
    })
    assert.deepEqual(resolved, { mime: 'application/pdf', ext: 'pdf' })
  })

  it('accepts application/x-pdf and octet-stream when the bytes are a PDF', () => {
    assert.equal(
      resolveProfessionalDocument({
        type: 'application/x-pdf',
        name: 'titulo',
        size: 80_000,
        head: PDF,
      }).mime,
      'application/pdf'
    )
    assert.equal(
      resolveProfessionalDocument({
        type: 'application/octet-stream',
        name: 'documento',
        size: 80_000,
        head: PDF,
      }).ext,
      'pdf'
    )
  })

  it('rejects a renamed file that is not a PDF', () => {
    assert.throws(
      () =>
        resolveProfessionalDocument({
          type: 'application/pdf',
          name: 'cedula.pdf',
          size: 40,
          head: JPEG,
        }),
      /formato de un PDF/
    )
  })

  it('still accepts a normal JPEG', () => {
    assert.deepEqual(
      resolveProfessionalDocument({
        type: 'image/jpeg',
        name: 'cedula.jpg',
        size: 40_000,
        head: JPEG,
      }),
      { mime: 'image/jpeg', ext: 'jpg' }
    )
  })

  it('rejects files over the app limit with a clear size message', () => {
    assert.throws(
      () =>
        resolveProfessionalDocument({
          type: 'application/pdf',
          name: 'cedula.pdf',
          size: PROFESSIONAL_DOCUMENT_MAX_BYTES + 1,
          head: PDF,
        }),
      /supera el máximo permitido/
    )
  })
})
