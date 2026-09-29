import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PUBLIC_KNOWLEDGE_NAMESPACES,
  assertPublicKnowledgeNamespace,
  isPublicKnowledgeNamespace,
  NamespaceNotAllowedError,
} from '@/lib/motty/namespaces'

describe('Hub Motty knowledge namespaces', () => {
  it('allows only brand and product', () => {
    assert.deepEqual([...PUBLIC_KNOWLEDGE_NAMESPACES], ['brand', 'product'])
    assert.equal(isPublicKnowledgeNamespace('brand'), true)
    assert.equal(isPublicKnowledgeNamespace('product'), true)
    assert.equal(isPublicKnowledgeNamespace('fundamentos'), false)
    assert.equal(isPublicKnowledgeNamespace('praxis'), false)
    assert.equal(isPublicKnowledgeNamespace('academy'), false)
  })

  it('rejects premium/internal namespaces server-side', () => {
    assert.throws(
      () => assertPublicKnowledgeNamespace('fundamentos'),
      (error: unknown) =>
        error instanceof NamespaceNotAllowedError &&
        error.namespace === 'fundamentos'
    )
    assert.throws(
      () => assertPublicKnowledgeNamespace('praxis'),
      NamespaceNotAllowedError
    )
  })
})
