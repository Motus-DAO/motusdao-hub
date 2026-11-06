import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertAllowedSiweDomain,
  getAllowedSiweDomains,
  getSiweIssueDomain,
  resolveSiweIssueDomain,
} from './siwe-domain'
import { AuthError } from './errors'

/** `NODE_ENV` is readonly in `@types/node`; tests need to toggle it at runtime. */
function setNodeEnv(value: string | undefined) {
  const env = process.env as Record<string, string | undefined>
  if (value === undefined) {
    delete env.NODE_ENV
  } else {
    env.NODE_ENV = value
  }
}

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
    setNodeEnv('development')
    try {
      assert.equal(
        resolveSiweIssueDomain('http://localhost:3000'),
        'localhost:3000'
      )
      assert.equal(getSiweIssueDomain(), 'app.motusdao.org')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = previousUrl
      setNodeEnv(previousEnv)
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
