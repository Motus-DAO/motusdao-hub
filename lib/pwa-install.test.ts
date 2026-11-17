import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PWA_HINT_DISMISS_KEY,
  PWA_VISIT_COUNT_KEY,
  dismissPwaHint,
  readPwaVisitCount,
  bumpPwaVisitCount,
  isPwaHintDismissed,
} from './pwa-install'

describe('pwa install hint', () => {
  it('tracks visit count and dismiss flag in localStorage', () => {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(PWA_VISIT_COUNT_KEY)
    localStorage.removeItem(PWA_HINT_DISMISS_KEY)
    assert.equal(readPwaVisitCount(), 0)
    assert.equal(bumpPwaVisitCount(), 1)
    assert.equal(bumpPwaVisitCount(), 2)
    assert.equal(isPwaHintDismissed(), false)
    dismissPwaHint()
    assert.equal(isPwaHintDismissed(), true)
  })
})