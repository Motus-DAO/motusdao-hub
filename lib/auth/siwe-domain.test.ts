import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertAllowedSiweDomain,
  getAllowedSiweDomains,
  getSiweIssueDomain,
  resolveSiweIssueDomain,
} from './siwe-domain'
import { AuthError } from './errors'

describe('SIWE domain allowlist', () => {
  it('issues domain from NEXT_PUBLIC_APP_URL when set', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://hub.motusdao.org'
    try {
      assert.equal(getSiweIssueDomain(), 'hub.motusdao.org')
      assert.ok(getAllowedSiweDomains().has('hub.motusdao.org'))
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = previous
    }
  })

  it('resolveSiweIssueDomain uses request host in non-production', () => {
    const previousUrl = process.env.NEXT_PUBLIC_APP_URL
    const previousEnv = process.env.NODE_ENV
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.motusdao.org'
    process.env.NODE_ENV = 'development'
    try {
      assert.equal(
        resolveSiweIssueDomain('http://localhost:3000'),
        'localhost:3000'
      )
      assert.equal(getSiweIssueDomain(), 'app.motusdao.org')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = previousUrl
      process.env.NODE_ENV = previousEnv
    }
  })

  it('rejects domains outside the allowlist', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://hub.motusdao.org'
    try {
      assert.throws(
        () => assertAllowedSiweDomain('evil.example'),
        (error: unknown) => error instanceof AuthError && error.statusCode === 401
      )
      assertAllowedSiweDomain('hub.motusdao.org')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = previous
    }
  })
})
