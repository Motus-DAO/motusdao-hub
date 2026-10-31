import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseSafeNotesPayload } from './payload'
import { SAFE_NOTES_PAYLOAD_VERSION } from './constants'

describe('safe-notes payload', () => {
  it('defaults kind from legacy mood', () => {
    const json = JSON.stringify({
      v: SAFE_NOTES_PAYLOAD_VERSION,
      content: 'hola',
      mood: 'anxious',
      tags: [],
    })
    const p = parseSafeNotesPayload(json)
    assert.equal(p.kind, 'emocional')
    assert.equal(p.mood, 'anxious')
  })

  it('keeps explicit kind and title inside payload shape', () => {
    const json = JSON.stringify({
      v: SAFE_NOTES_PAYLOAD_VERSION,
      kind: 'secreto',
      title: 'Cuenta banco',
      content: 'usuario: x',
      mood: 'neutral',
      tags: ['finanzas'],
    })
    const p = parseSafeNotesPayload(json)
    assert.equal(p.kind, 'secreto')
    assert.equal(p.title, 'Cuenta banco')
  })
})
