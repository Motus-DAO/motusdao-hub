import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveProxyBaseUrl } from '@/lib/psychat-context/settings'
import { defaultPsychatContextSettings } from '@/lib/psychat-context/settings'

describe('psychat context settings', () => {
  it('returns null proxy URL for hub default', () => {
    assert.equal(resolveProxyBaseUrl(defaultPsychatContextSettings()), null)
  })

  it('returns local URL for local_rootrouter mode', () => {
    const url = resolveProxyBaseUrl({
      ...defaultPsychatContextSettings(),
      mode: 'local_rootrouter',
      localProxyUrl: 'http://127.0.0.1:8787',
    })
    assert.equal(url, 'http://127.0.0.1:8787')
  })
})
