import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { userHasAdminPrivileges } from './admin-access'

describe('admin access from database row', () => {
  it('denies when JWT would say platform admin but database row does not', () => {
    assert.equal(
      userHasAdminPrivileges({ role: 'usuario', isPlatformAdmin: false }),
      false
    )
  })

  it('allows role admin or isPlatformAdmin', () => {
    assert.equal(userHasAdminPrivileges({ role: 'admin', isPlatformAdmin: false }), true)
    assert.equal(
      userHasAdminPrivileges({ role: 'psm', isPlatformAdmin: true }),
      true
    )
  })
})
