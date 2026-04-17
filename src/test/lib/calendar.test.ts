// src/test/lib/calendar.test.ts
import { describe, it, expect } from 'vitest'
import { getDayInfo, isDaySelectable, hasReservationConflict } from '@/lib/calendar'
import type { Reservation, User } from '@/types'

const makeUser = (familyId: string | null = 'family-a'): User => ({
  id: 'user-1',
  clerk_user_id: 'clerk-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  family_id: familyId,
  role: 'user',
  receive_notifications: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

const makeReservation = (checkIn: string, checkOut: string, familyId = 'family-b'): Reservation => ({
  id: 'res-1',
  user_id: 'user-2',
  user: {
    id: 'user-2',
    clerk_user_id: 'clerk-2',
    email: 'other@example.com',
    first_name: 'Otro',
    last_name: 'Usuario',
    family_id: familyId,
    role: 'user',
    receive_notifications: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  check_in: checkIn,
  check_out: checkOut,
  nights: 3,
  total_price: 90,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  cancelled_at: null,
})

describe('getDayInfo', () => {
  const user = makeUser('family-a')
  const noReservations: Reservation[] = []

  it('días pasados son state=past', () => {
    const info = getDayInfo('2020-01-01', 1, noReservations, user, null, null, null)
    expect(info.state).toBe('past')
    expect(info.hasGoldDot).toBe(false)
  })

  it('días reservados son state=reserved con nombre del reservador', () => {
    const reservation = makeReservation('2030-06-10', '2030-06-15')
    const info = getDayInfo('2030-06-12', 12, [reservation], user, null, null, null)
    expect(info.state).toBe('reserved')
    expect(info.reserverName).toBe('Otro Usuario')
  })

  it('primer día de la reserva es reserved, el checkout no', () => {
    const reservation = makeReservation('2030-06-10', '2030-06-13')
    const inFirst = getDayInfo('2030-06-10', 10, [reservation], user, null, null, null)
    const atCheckout = getDayInfo('2030-06-13', 13, [reservation], user, null, null, null)
    expect(inFirst.state).toBe('reserved')
    expect(atCheckout.state).toBe('available')
  })

  it('agosto bloqueado cuando familia no coincide', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, 'family-b', null, null)
    expect(info.state).toBe('august-blocked')
  })

  it('agosto NO bloqueado cuando familia coincide', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, 'family-a', null, null)
    expect(info.state).not.toBe('august-blocked')
  })

  it('agosto NO bloqueado cuando augustFamilyId es null', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, null, null, null)
    expect(info.state).not.toBe('august-blocked')
  })

  it('día de inicio seleccionado es selected-start', () => {
    const info = getDayInfo('2030-07-01', 1, noReservations, user, null, '2030-07-01', '2030-07-05')
    expect(info.state).toBe('selected-start')
  })

  it('día de fin seleccionado es selected-end', () => {
    const info = getDayInfo('2030-07-05', 5, noReservations, user, null, '2030-07-01', '2030-07-05')
    expect(info.state).toBe('selected-end')
  })

  it('días intermedios en el rango son in-range', () => {
    const info = getDayInfo('2030-07-03', 3, noReservations, user, null, '2030-07-01', '2030-07-05')
    expect(info.state).toBe('in-range')
  })

  it('día fuera del rango seleccionado es available', () => {
    const info = getDayInfo('2030-07-07', 7, noReservations, user, null, '2030-07-01', '2030-07-05')
    expect(info.state).toBe('available')
  })

  it('reserva cancelada no bloquea el día', () => {
    const cancelled: Reservation = { ...makeReservation('2030-07-01', '2030-07-05'), status: 'cancelled' }
    const info = getDayInfo('2030-07-03', 3, [cancelled], user, null, null, null)
    expect(info.state).toBe('available')
  })

  it('pasado tiene prioridad sobre reservado', () => {
    const reservation = makeReservation('2020-01-01', '2020-01-05')
    const info = getDayInfo('2020-01-03', 3, [reservation], user, null, null, null)
    expect(info.state).toBe('past')
  })

  it('en selección parcial (solo start), días no seleccionados siguen siendo available', () => {
    const info = getDayInfo('2030-07-10', 10, noReservations, user, null, '2030-07-01', null)
    expect(info.state).toBe('available')
  })
})

describe('isDaySelectable', () => {
  it('available es seleccionable', () => expect(isDaySelectable('available')).toBe(true))
  it('today es seleccionable', () => expect(isDaySelectable('today')).toBe(true))
  it('past no es seleccionable', () => expect(isDaySelectable('past')).toBe(false))
  it('reserved no es seleccionable', () => expect(isDaySelectable('reserved')).toBe(false))
  it('august-blocked no es seleccionable', () => expect(isDaySelectable('august-blocked')).toBe(false))
  it('selected-start es seleccionable', () => expect(isDaySelectable('selected-start')).toBe(true))
  it('selected-end no es seleccionable', () => expect(isDaySelectable('selected-end')).toBe(false))
  it('in-range es seleccionable', () => expect(isDaySelectable('in-range')).toBe(true))
})

describe('hasReservationConflict', () => {
  it('detecta solapamiento parcial al inicio', () => {
    const res = makeReservation('2030-07-08', '2030-07-12')
    expect(hasReservationConflict('2030-07-06', '2030-07-10', [res])).toBe(true)
  })

  it('detecta solapamiento parcial al final', () => {
    const res = makeReservation('2030-07-08', '2030-07-12')
    expect(hasReservationConflict('2030-07-10', '2030-07-15', [res])).toBe(true)
  })

  it('detecta reserva completamente dentro del rango', () => {
    const res = makeReservation('2030-07-09', '2030-07-11')
    expect(hasReservationConflict('2030-07-08', '2030-07-12', [res])).toBe(true)
  })

  it('no hay conflicto cuando el rango es adyacente', () => {
    const res = makeReservation('2030-07-08', '2030-07-12')
    expect(hasReservationConflict('2030-07-12', '2030-07-15', [res])).toBe(false)
    expect(hasReservationConflict('2030-07-05', '2030-07-08', [res])).toBe(false)
  })

  it('reservas canceladas no producen conflicto', () => {
    const res: Reservation = { ...makeReservation('2030-07-08', '2030-07-12'), status: 'cancelled' }
    expect(hasReservationConflict('2030-07-08', '2030-07-12', [res])).toBe(false)
  })

  it('sin reservas no hay conflicto', () => {
    expect(hasReservationConflict('2030-07-08', '2030-07-12', [])).toBe(false)
  })
})
