import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  allowedRolesFor,
  signActiveRole,
  verifyActiveRole,
} from './active-role'

process.env.ROLE_SWITCHER_DEV = 'false'

describe('active role', () => {
  it('a patient can only be a patient', () => {
    assert.deepEqual(allowedRolesFor({ role: 'usuario', isPlatformAdmin: false }), [
      'usuario',
    ])
  })

  it('a professional only has the professional role', () => {
    assert.deepEqual(allowedRolesFor({ role: 'psm', isPlatformAdmin: false }), ['psm'])
  })

  it('a platform admin can switch all roles', () => {
    assert.deepEqual(allowedRolesFor({ role: 'psm', isPlatformAdmin: true }), [
      'usuario',
      'psm',
      'admin',
    ])
    assert.deepEqual(allowedRolesFor({ role: 'admin', isPlatformAdmin: false }), [
      'usuario',
      'psm',
      'admin',
    ])
  })

  it('only verifies the token for the same user', () => {
    const token = signActiveRole('user-1', 'psm')
    assert.equal(verifyActiveRole(token, 'user-1'), 'psm')
    assert.equal(verifyActiveRole(token, 'user-2'), null)
  })
})
