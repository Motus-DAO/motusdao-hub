import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PSM_INTRO_VIDEO_MAX_BYTES, resolvePsmIntroVideo } from './storage-intro-video'

const MP4_HEAD = Uint8Array.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
])

describe('PSM intro video upload', () => {
  it('accepts iPhone MOV when MIME is video/quicktime', () => {
    const resolved = resolvePsmIntroVideo({
      type: 'video/quicktime',
      name: 'presentacion.mov',
      size: 2_000_000,
      head: MP4_HEAD,
    })
    assert.equal(resolved.ext, 'mov')
  })

  it('accepts mp4 with empty MIME from some Android browsers', () => {
    const resolved = resolvePsmIntroVideo({
      type: '',
      name: 'intro.mp4',
      size: 500_000,
      head: MP4_HEAD,
    })
    assert.equal(resolved.ext, 'mp4')
  })

  it('rejects oversize files with a clear message', () => {
    assert.throws(
      () =>
        resolvePsmIntroVideo({
          type: 'video/mp4',
          name: 'intro.mp4',
          size: PSM_INTRO_VIDEO_MAX_BYTES + 1,
          head: MP4_HEAD,
        }),
      /supera el máximo permitido/
    )
  })
})
