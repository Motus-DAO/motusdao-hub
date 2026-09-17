import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isWaapOverlayStuckBlank } from './waap-modal-recovery'

describe('isWaapOverlayStuckBlank', () => {
  it('does not flag a healthy signing modal', () => {
    assert.equal(
      isWaapOverlayStuckBlank({
        modalPhase: 'visible',
        visualReadyAt: 1000,
        modalRequestedAt: 1,
      }),
      false
    )
  })

  it('flags pending modal with no paint after 10s', () => {
    const now = 20_000
    assert.equal(
      isWaapOverlayStuckBlank(
        {
          modalPhase: 'pending',
          visualReadyAt: null,
          modalRequestedAt: 1,
        },
        now
      ),
      true
    )
  })

  it('flags visible shell without visualReady', () => {
    const now = 20_000
    assert.equal(
      isWaapOverlayStuckBlank(
        {
          modalPhase: 'visible',
          visualReadyAt: null,
          modalRequestedAt: 1,
        },
        now
      ),
      true
    )
  })

  it('ignores idle/hidden', () => {
    assert.equal(
      isWaapOverlayStuckBlank({
        modalPhase: 'idle',
        visualReadyAt: null,
        modalRequestedAt: null,
      }),
      false
    )
  })
})
