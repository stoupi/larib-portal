import { describe, expect, it } from 'vitest'
import { nextCalibrationStatus } from './status'

describe('nextCalibrationStatus', () => {
  it('stays not started while nothing has been opened', () => {
    expect(nextCalibrationStatus([{ status: 'NOT_STARTED' }, { status: 'NOT_STARTED' }])).toBe('NOT_STARTED')
  })
  it('moves to in progress as soon as one case is opened', () => {
    expect(nextCalibrationStatus([{ status: 'IN_PROGRESS' }, { status: 'NOT_STARTED' }])).toBe('IN_PROGRESS')
    expect(nextCalibrationStatus([{ status: 'SUBMITTED' }, { status: 'NOT_STARTED' }])).toBe('IN_PROGRESS')
  })
  it('waits for review once every case is submitted', () => {
    expect(nextCalibrationStatus([{ status: 'SUBMITTED' }, { status: 'SUBMITTED' }])).toBe('AWAITING_REVIEW')
  })
  it('keeps a reviewed set out of the waiting list', () => {
    expect(nextCalibrationStatus([{ status: 'REVIEWED' }, { status: 'SUBMITTED' }])).toBe('IN_PROGRESS')
  })
  it('stays not started when no case is assigned', () => {
    expect(nextCalibrationStatus([])).toBe('NOT_STARTED')
  })
})
