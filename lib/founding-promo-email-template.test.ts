import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildFoundingPromoEmailContent,
  foundingPromoEmailSubject,
} from './founding-promo-email-template'

describe('founding promo email', () => {
  it('subject includes role and position', () => {
    const sub = foundingPromoEmailSubject({
      role: 'user',
      email: 'a@b.c',
      displayName: 'Ana',
      position: 3,
      discountPercent: 50,
      code: 'MTU-3-ANA',
      locale: 'es',
    })
    assert.match(sub, /Usuario \(#3\)/)
  })

  it('html uses Lab-style shell and color-scheme', () => {
    const { html, text } = buildFoundingPromoEmailContent({
      role: 'psm',
      email: 'p@b.c',
      displayName: 'Dr. García',
      position: 2,
      discountPercent: 50,
      code: 'MTP-2-DRGARCIA',
      locale: 'es',
    })
    assert.match(html, /color-scheme.*light dark/)
    assert.match(html, /prefers-color-scheme: light/)
    assert.match(html, /MTP-2-DRGARCIA/)
    assert.match(html, /academia\?from=founding-code/)
    assert.doesNotMatch(html, /<script/)
    assert.match(text, /MTP-2-DRGARCIA/)
  })

  it('escapes display name in html', () => {
    const { html } = buildFoundingPromoEmailContent({
      role: 'user',
      email: 'x@y.z',
      displayName: '<b>Eve</b>',
      position: 1,
      discountPercent: 50,
      code: 'MTU-1-EVE',
      locale: 'en',
    })
    assert.match(html, /&lt;b&gt;Eve&lt;\/b&gt;/)
    assert.doesNotMatch(html, /<b>Eve<\/b>/)
  })
})