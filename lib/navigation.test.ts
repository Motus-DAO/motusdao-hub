import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getNavigationGroups, getNavigationItems } from './navigation'

const links = (role: 'usuario' | 'psm' | 'admin', isPlatformAdmin = false) =>
  getNavigationItems(role, { isPlatformAdmin }).map((item) => item.href)

describe('role-aware navigation', () => {
  it('a patient sees Psicoterapia, never Disponibilidad or Admin', () => {
    const hrefs = links('usuario')
    assert.ok(hrefs.includes('/psicoterapia'))
    assert.ok(!hrefs.includes('/disponibilidad'))
    assert.ok(!hrefs.includes('/admin'))
    assert.ok(!hrefs.includes('/mis-usuarios'))
  })

  it('a PSM reaches Disponibilidad from the menu', () => {
    const hrefs = links('psm')
    assert.ok(hrefs.includes('/disponibilidad'))
    assert.ok(hrefs.includes('/mis-usuarios'))
    assert.ok(!hrefs.includes('/admin'))
  })

  it('a platform-admin PSM keeps Disponibilidad and also gets Admin', () => {
    const hrefs = links('psm', true)
    assert.ok(hrefs.includes('/disponibilidad'))
    assert.ok(hrefs.includes('/admin'))
    assert.ok(hrefs.includes('/perfil'))
  })

  it('the active admin role keeps practice links and the profile', () => {
    const hrefs = links('admin')
    assert.ok(hrefs.includes('/disponibilidad'))
    assert.ok(hrefs.includes('/admin'))
    assert.ok(hrefs.includes('/perfil'))
  })

  it('groups keep a single Inicio and domain headers', () => {
    const groups = getNavigationGroups('psm')
    assert.deepEqual(
      groups.map((group) => group.title),
      [null, 'Práctica', 'Finanzas', 'Aprender', 'Cuenta']
    )
    assert.equal(
      groups.flatMap((group) => group.items).filter((item) => item.href === '/').length,
      1
    )
  })
})
