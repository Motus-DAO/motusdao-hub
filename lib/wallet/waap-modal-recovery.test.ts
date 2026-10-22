import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isWaapModalHoldingInput, isWaapOverlayStuckBlank } from './waap-modal-recovery'

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

  it('does not flag a visible fallback modal', () => {
    assert.equal(
      isWaapOverlayStuckBlank(
        {
          modalPhase: 'visible',
          visualReadyAt: null,
          modalRequestedAt: 1,
          usedVisualFallback: true,
        },
        20_000
      ),
      false
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

describe('isWaapModalHoldingInput', () => {
  it('holds clicks for a painted signing modal', () => {
    assert.equal(
      isWaapModalHoldingInput({
        modalPhase: 'visible',
        visualReadyAt: 1000,
        modalRequestedAt: 1,
      }),
      true
    )
  })

  it('holds clicks while a modal is still opening', () => {
    assert.equal(
      isWaapModalHoldingInput(
        {
          modalPhase: 'pending',
          visualReadyAt: null,
          modalRequestedAt: 15_000,
        },
        20_000
      ),
      true
    )
  })

  it('holds clicks for a visible fallback modal', () => {
    assert.equal(
      isWaapModalHoldingInput(
        {
          modalPhase: 'visible',
          visualReadyAt: null,
          modalRequestedAt: 1,
          usedVisualFallback: true,
        },
        20_000
      ),
      true
    )
  })

  it('drops clicks for a blank shell and for a closed one', () => {
    assert.equal(
      isWaapModalHoldingInput(
        {
          modalPhase: 'visible',
          visualReadyAt: null,
          modalRequestedAt: 1,
        },
        20_000
      ),
      false
    )
    assert.equal(
      isWaapModalHoldingInput({
        modalPhase: 'hidden',
        visualReadyAt: null,
        modalRequestedAt: 1,
      }),
      false
    )
    assert.equal(
      isWaapModalHoldingInput({
        modalPhase: 'idle',
        visualReadyAt: null,
        modalRequestedAt: null,
      }),
      false
    )
  })
})
