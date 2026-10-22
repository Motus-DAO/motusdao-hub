import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertRelayMessages,
  decryptChunk,
  encryptConversation,
  encryptMessage,
  generateSessionKey,
  isValidEncrypted,
} from './venice-e2ee'

describe('venice e2ee', () => {
  it('encrypts to the recipient key and decrypts with that private key', () => {
    const model = generateSessionKey()
    const encrypted = encryptMessage('el texto no viaja en claro', model.publicKeyHex)
    assert.equal(encrypted.includes('el texto no viaja en claro'), false)
    assert.equal(isValidEncrypted(encrypted), true)
    assert.equal(decryptChunk(encrypted, model.privateKey), 'el texto no viaja en claro')
  })

  it('rejects a user turn that is still plaintext', () => {
    assert.throws(() => assertRelayMessages([{ role: 'user', content: 'hola' }]), /no va cifrado/)
  })

  it('keeps earlier replies inside the encrypted user turn', () => {
    const model = generateSessionKey()
    const messages = encryptConversation(
      [
        { role: 'assistant', content: 'primera respuesta' },
        { role: 'user', content: 'segunda pregunta' },
      ],
      model.publicKeyHex
    )
    assert.deepEqual(
      messages.map((message) => message.role),
      ['system', 'user']
    )
    assert.equal(messages.some((message) => message.content.includes('primera respuesta')), false)
    assert.doesNotThrow(() => assertRelayMessages(messages))
  })
})
