import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  resolveMottyPageSurface,
  sanitizeMottyPagePath,
  mottyPageCopy,
} from '@/lib/motty/page-context'

describe('Motty page context', () => {
  it('maps Hub paths to surfaces', () => {
    assert.equal(resolveMottyPageSurface('/'), 'home')
    assert.equal(resolveMottyPageSurface('/motusai'), 'motusai')
    assert.equal(resolveMottyPageSurface('/academia/02-fundamentos'), 'academia')
    assert.equal(resolveMottyPageSurface('/pagos'), 'pagos')
    assert.equal(resolveMottyPageSurface('/perfil'), 'perfil')
    assert.equal(resolveMottyPageSurface('/unknown-space'), 'default')
  })

  it('sanitizes pagePath and rejects injection-like values', () => {
    assert.equal(sanitizeMottyPagePath('/pagos'), '/pagos')
    assert.equal(sanitizeMottyPagePath('../etc/passwd'), null)
    assert.equal(sanitizeMottyPagePath('https://evil.test'), null)
    assert.equal(sanitizeMottyPagePath({ path: '/pagos' }), null)
  })

  it('home and pagos copy stay distinct', () => {
    const home = mottyPageCopy('es', 'home')
    const pagos = mottyPageCopy('es', 'pagos')
    assert.match(home.greeting, /Hub|inicio/i)
    assert.match(pagos.greeting, /Pagos/i)
    assert.notEqual(home.title, pagos.title)
  })
})
