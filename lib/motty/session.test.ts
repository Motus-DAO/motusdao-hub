import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createEmptySession, appendTurn } from '@/lib/motty/session'
import type { MottySession } from '@/lib/motty/types'

describe('Hub Motty session binding', () => {
  it('creates sessions with server-provided userId only', () => {
    const session = createEmptySession('user_abc', 'es')
    assert.equal(session.userId, 'user_abc')
    assert.equal(session.locale, 'es')
    assert.equal(session.messages.length, 0)
  })

  it('never invents a different userId on append', () => {
    const base = createEmptySession('user_abc', 'es')
    const next = appendTurn(base, 'hola', 'respuesta')
    assert.equal(next.userId, 'user_abc')
    assert.equal(next.messages.length, 2)
  })

  it('types require userId on MottySession', () => {
    const session: MottySession = createEmptySession('u1', 'en')
    assert.ok(session.userId)
  })
})
