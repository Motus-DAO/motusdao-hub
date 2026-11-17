import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mergeProfileLanguages, splitProfileLanguages } from '@/lib/profile-languages'

describe('profile-languages', () => {
  it('mergeProfileLanguages keeps multiple known codes', () => {
    assert.deepEqual(mergeProfileLanguages(['es', 'en'], ''), ['es', 'en'])
  })

  it('splitProfileLanguages separates custom', () => {
    const { known, custom } = splitProfileLanguages(['es', 'Catalán'])
    assert.deepEqual(known, ['es'])
    assert.equal(custom, 'Catalán')
  })
})