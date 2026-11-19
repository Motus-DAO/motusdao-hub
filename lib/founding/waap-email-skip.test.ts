import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldSkipWaapVerifiedEmailShare } from './waap-email-skip'
import { useUIStore } from '@/lib/store'
import { writeFoundingDraft, clearFoundingDraft } from './waitlist-modal-draft'

function installSessionStorageMock() {
  const data = new Map<string, string>()
  ;(globalThis as { sessionStorage?: Storage }).sessionStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  }
}

describe('shouldSkipWaapVerifiedEmailShare', () => {
  installSessionStorageMock()
  it('is false outside founding-waitlist login', () => {
    useUIStore.setState({ loginModalLocation: 'topbar' })
    clearFoundingDraft()
    assert.equal(shouldSkipWaapVerifiedEmailShare(), false)
  })

  it('is true for founding-waitlist when draft has valid email', () => {
    useUIStore.setState({ loginModalLocation: 'founding-waitlist' })
    writeFoundingDraft({
      step: 'wallet',
      role: 'user',
      displayName: 'Test',
      email: 'founder@example.com',
      optionalNote: '',
      mnsLabel: null,
      mnsTxHash: null,
      updatedAt: new Date().toISOString(),
    })
    assert.equal(shouldSkipWaapVerifiedEmailShare(), true)
    clearFoundingDraft()
    useUIStore.setState({ loginModalLocation: 'unknown' })
  })
})