import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  alternatePsychatProxyUrl,
  parseLocalProxyPort,
  ROOTROUTER_FALLBACK_PROXY_PORT,
} from '@/lib/psychat-context/proxy-port'
import { rootRouterProxyStartScript } from '@/lib/psychat-context/rootrouter-cli-copy'

describe('parseLocalProxyPort', () => {
  it('defaults to 8787', () => {
    assert.equal(parseLocalProxyPort('http://127.0.0.1:8787'), 8787)
    assert.equal(parseLocalProxyPort(''), 8787)
  })

  it('reads custom port from URL', () => {
    assert.equal(parseLocalProxyPort('http://127.0.0.1:8790'), ROOTROUTER_FALLBACK_PROXY_PORT)
  })
})

describe('alternatePsychatProxyUrl', () => {
  it('switches 8787 to fallback port', () => {
    assert.equal(alternatePsychatProxyUrl('http://127.0.0.1:8787'), 'http://127.0.0.1:8790')
  })
})

describe('rootRouterProxyStartScript', () => {
  it('embeds PORT from proxy URL', () => {
    const script = rootRouterProxyStartScript('https://app.motusdao.org', 'http://127.0.0.1:8790')
    assert.match(script, /export PORT=8790/)
    assert.match(script, /ROOTROUTER_UPSTREAM_ORIGIN="https:\/\/app.motusdao.org"/)
  })
})
