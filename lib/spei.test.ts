import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatClabe,
  isValidClabe,
  parseMxnAmount,
  normalizeTransferReference,
  transferState,
  TRANSFER_CONFIRMED,
  TRANSFER_REJECTED,
  TRANSFER_REPORTED,
} from './spei'

describe('SPEI CLABE', () => {
  it('accepts the published 18-digit example and rejects a bad check digit', () => {
    assert.equal(isValidClabe('032180000118359719'), true)
    assert.equal(isValidClabe('0321 8000 0118 3597 19'), true)
    assert.equal(isValidClabe('032180000118359710'), false)
    assert.equal(isValidClabe('03218000011835971'), false)
  })

  it('groups a CLABE for display', () => {
    assert.equal(formatClabe('032180000118359719'), '0321 8000 0118 3597 19')
  })
})

describe('SPEI transfer report', () => {
  it('parses a peso amount and rejects empty or oversized values', () => {
    assert.equal(parseMxnAmount('1000'), 1000)
    assert.equal(parseMxnAmount('1000.50'), 1000.5)
    assert.equal(parseMxnAmount('0'), null)
    assert.equal(parseMxnAmount('1000.505'), null)
    assert.equal(parseMxnAmount(''), null)
  })

  it('keeps a tracking key and drops free text', () => {
    assert.equal(normalizeTransferReference(' mb an 0100 '), 'MBAN0100')
    assert.equal(normalizeTransferReference('no'), null)
    assert.equal(normalizeTransferReference('clave con símbolos'), null)
  })

  it('treats the latest event as the payment state', () => {
    assert.equal(transferState([]), 'none')
    assert.equal(transferState([TRANSFER_REPORTED]), 'reported')
    assert.equal(transferState([TRANSFER_REPORTED, TRANSFER_CONFIRMED]), 'confirmed')
    assert.equal(
      transferState([TRANSFER_REPORTED, TRANSFER_REJECTED, TRANSFER_REPORTED]),
      'reported'
    )
  })
})
