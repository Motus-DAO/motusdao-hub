import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getEffectiveAccentColor,
  isAccentColor,
  migratePersistedAccentColor,
} from './accent-color'

describe('accent color defaults', () => {
  it('light/dark default to pink until the user picks a color', () => {
    assert.equal(getEffectiveAccentColor('light', null), 'pink')
    assert.equal(getEffectiveAccentColor('dark', undefined), 'pink')
  })

  it('matrix defaults to green until the user picks a color', () => {
    assert.equal(getEffectiveAccentColor('matrix', null), 'green')
  })

  it('a picked color applies in every theme', () => {
    assert.equal(getEffectiveAccentColor('light', 'blue'), 'blue')
    assert.equal(getEffectiveAccentColor('dark', 'blue'), 'blue')
    assert.equal(getEffectiveAccentColor('matrix', 'blue'), 'blue')
    assert.equal(getEffectiveAccentColor('matrix', 'pink'), 'pink')
  })

  it('migrates a customized matrix color and leaves the green default unset', () => {
    assert.equal(migratePersistedAccentColor('red'), 'red')
    assert.equal(migratePersistedAccentColor('pink'), 'pink')
    assert.equal(migratePersistedAccentColor('green'), null)
    assert.equal(migratePersistedAccentColor(undefined), null)
    assert.equal(isAccentColor('orange'), true)
    assert.equal(isAccentColor('mauve'), false)
  })
})
