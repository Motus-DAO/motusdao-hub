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

  it('resolves default structured mode by role for each user turn', () => {
    assert.equal(resolvePsychatStructuredMode('psm', 'caso clínico anonimizado'), 'supervisor')
    assert.equal(resolvePsychatStructuredMode('usuario', 'modo supervisor'), 'exploracion')
    assert.equal(resolvePsychatStructuredMode('usuario', 'hola'), 'exploracion')
    assert.equal(resolvePsychatStructuredMode('psm', ''), null)
    assert.equal(resolvePsychatStructuredMode('usuario', '   '), null)
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
