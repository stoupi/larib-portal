import { describe, expect, test } from 'vitest'
import { invitationPayloadToUserData, type InvitationPayload } from './invitations'

const arrivalDate = new Date('2026-01-15T00:00:00.000Z')
const departureDate = new Date('2026-12-31T00:00:00.000Z')

const basePayload: InvitationPayload = {
  email: 'invitee@example.com',
  locale: 'fr',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'USER',
  position: 'Cardiologist',
  applications: ['CONGES'],
  adminApplications: [],
  arrivalDate,
  departureDate,
  congesTotalDays: 25,
}

describe('invitationPayloadToUserData', () => {
  test('carries the leave allowance set by the admin', () => {
    const data = invitationPayloadToUserData(basePayload)
    expect(data.congesTotalDays).toBe(25)
  })

  test('carries the arrival date alongside the departure date', () => {
    const data = invitationPayloadToUserData(basePayload)
    expect(data.arrivalDate).toEqual(arrivalDate)
    expect(data.departureDate).toEqual(departureDate)
  })

  test('defaults the leave allowance to 0 when the admin left it empty', () => {
    const data = invitationPayloadToUserData({ ...basePayload, congesTotalDays: undefined })
    expect(data.congesTotalDays).toBe(0)
  })

  test('maps the invited role, language and applications', () => {
    const data = invitationPayloadToUserData(basePayload)
    expect(data.role).toBe('USER')
    expect(data.language).toBe('FR')
    expect(data.applications).toEqual(['CONGES'])
  })
})
