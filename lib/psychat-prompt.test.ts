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

  it('detects supervisor trigger in user text (legacy copy)', () => {
    assert.equal(wantsSupervisorMode('Activa Modo Supervisor'), true)
    assert.equal(wantsSupervisorMode('modo exploración'), false)
  })

  it('detects exploracion trigger', () => {
    assert.equal(wantsExploracionMode('Quiero explorar lo que siento'), true)
    assert.equal(wantsExploracionMode('modo reflexión'), true)
  })

  it('PSM: conversational by default; structured only via requestStructuredReport', () => {
    assert.equal(resolvePsychatStructuredMode('psm', 'caso clínico anonimizado'), null)
    assert.equal(
      resolvePsychatStructuredMode('psm', 'caso clínico anonimizado', { requestStructuredReport: true }),
      'supervisor'
    )
    assert.equal(resolvePsychatStructuredMode('psm', 'modo supervisor'), null)
    assert.equal(resolvePsychatStructuredMode('usuario', 'hola'), 'exploracion')
    assert.equal(
      resolvePsychatStructuredMode('usuario', 'quiero explorar lo que siento'),
      'exploracion'
    )
  })

  it('scopes prompts by role', () => {
    const usuario = getPsychatSystemPrompt('usuario')
    const psm = getPsychatSystemPrompt('psm')
    assert.match(usuario, /Modo exploración/)
    assert.match(psm, /Modo Supervisor/)
    assert.match(psm, /Dispositivo de Verificación de Casos/)
  })
})
