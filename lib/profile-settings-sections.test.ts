import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  profileSectionsForRole,
  isProfileSectionId,
} from '@/lib/profile-settings-sections'

describe('profile-settings-sections', () => {
  it('filters stripe for psm only', () => {
    const usuario = profileSectionsForRole('usuario').map((s) => s.id)
    const psm = profileSectionsForRole('psm').map((s) => s.id)
    assert.equal(usuario.includes('perfil-stripe'), false)
    assert.equal(psm.includes('perfil-stripe'), true)
  })

  it('isProfileSectionId', () => {
    assert.equal(isProfileSectionId('perfil-wallets'), true)
    assert.equal(isProfileSectionId('nope'), false)
  })
})