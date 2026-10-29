import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getPsychatSystemPrompt,
  normalizePsychatRole,
  resolvePsychatStructuredMode,
  wantsExploracionMode,
  wantsSupervisorMode,
} from './psychat-prompt'

describe('psychat-prompt modes', () => {
  it('normalizes hub role', () => {
    assert.equal(normalizePsychatRole('psm'), 'psm')
    assert.equal(normalizePsychatRole('usuario'), 'usuario')
    assert.equal(normalizePsychatRole(null), 'usuario')
  })

  it('detects supervisor trigger', () => {
    assert.equal(wantsSupervisorMode('Activa Modo Supervisor'), true)
    assert.equal(wantsSupervisorMode('modo exploración'), false)
  })

  it('detects exploracion trigger', () => {
    assert.equal(wantsExploracionMode('Quiero explorar lo que siento'), true)
    assert.equal(wantsExploracionMode('modo reflexión'), true)
    assert.equal(wantsSupervisorMode('modo supervisor'), true)
  })

  it('resolves structured mode by role', () => {
    assert.equal(resolvePsychatStructuredMode('psm', 'modo supervisor'), 'supervisor')
    assert.equal(resolvePsychatStructuredMode('usuario', 'modo supervisor'), null)
    assert.equal(resolvePsychatStructuredMode('usuario', 'activa modo exploración'), 'exploracion')
    assert.equal(resolvePsychatStructuredMode('psm', 'activa modo exploración'), null)
  })

  it('scopes prompts by role', () => {
    const usuario = getPsychatSystemPrompt('usuario')
    const psm = getPsychatSystemPrompt('psm')
    assert.match(usuario, /Modo exploración/)
    assert.doesNotMatch(usuario, /Modo Supervisor.*verificación de caso/s)
    assert.match(psm, /Modo Supervisor/)
    assert.doesNotMatch(psm, /Modo exploración.*personas usuarias/)
  })
})
