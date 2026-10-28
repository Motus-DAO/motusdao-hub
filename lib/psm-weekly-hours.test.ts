import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getWeeklyTherapyHoursInsight,
  PSM_MAX_WEEKLY_THERAPY_HOURS,
  PSM_WEEKLY_HOURS_WARNING_THRESHOLD,
} from './psm-weekly-hours'

describe('weekly therapy hours insight', () => {
  it('does not warn at or below the threshold', () => {
    assert.equal(getWeeklyTherapyHoursInsight(PSM_WEEKLY_HOURS_WARNING_THRESHOLD), null)
    assert.equal(getWeeklyTherapyHoursInsight(40), null)
  })

  it('warns with sessions-per-day copy for high values like 150', () => {
    const insight = getWeeklyTherapyHoursInsight(150)
    assert.ok(insight)
    assert.equal(insight.approxSessionsPerWorkDay, 30)
    assert.match(insight.message, /150 h\/semana/)
    assert.match(insight.message, /humanamente/)
  })

  it('allows up to a full week of hours as form max', () => {
    assert.equal(PSM_MAX_WEEKLY_THERAPY_HOURS, 168)
  })
})
