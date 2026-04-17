// src/lib/calendar.ts
import { isDateInRange, todayISO } from '@/lib/utils'
import type { Reservation, User } from '@/types'

export type DayState =
  | 'past'
  | 'reserved'
  | 'august-blocked'
  | 'selected-start'
  | 'selected-end'
  | 'in-range'
  | 'today'
  | 'available'

export interface DayInfo {
  date: string        // 'YYYY-MM-DD'
  dayOfMonth: number
  state: DayState
  hasGoldDot: boolean
  reserverName?: string
  reservationId?: string
}

export function getDayInfo(
  date: string,
  dayOfMonth: number,
  reservations: Reservation[],
  currentUser: User,
  augustFamilyId: string | null,
  selectedStart: string | null,
  selectedEnd: string | null,
): DayInfo {
  const today = todayISO()
  const hasGoldDot = date === today

  // 1. Pasado (excluyendo hoy)
  if (date < today) {
    return { date, dayOfMonth, state: 'past', hasGoldDot: false }
  }

  // 2. Reservado
  const coveringReservation = reservations.find(r =>
    r.status === 'active' && isDateInRange(date, r.check_in, r.check_out)
  )
  if (coveringReservation) {
    const u = coveringReservation.user
    const reserverName = u ? `${u.first_name} ${u.last_name}` : 'Reservado'
    return { date, dayOfMonth, state: 'reserved', hasGoldDot, reserverName, reservationId: coveringReservation.id }
  }

  // 3. Agosto bloqueado
  const isAugust = date.substring(5, 7) === '08'
  if (isAugust && augustFamilyId !== null && currentUser.family_id !== augustFamilyId) {
    return { date, dayOfMonth, state: 'august-blocked', hasGoldDot }
  }

  // 4. Selección activa
  if (date === selectedStart) {
    return { date, dayOfMonth, state: 'selected-start', hasGoldDot }
  }
  if (date === selectedEnd) {
    return { date, dayOfMonth, state: 'selected-end', hasGoldDot }
  }
  if (selectedStart && selectedEnd && date > selectedStart && date < selectedEnd) {
    return { date, dayOfMonth, state: 'in-range', hasGoldDot }
  }

  // 5. Hoy disponible
  if (hasGoldDot) {
    return { date, dayOfMonth, state: 'today', hasGoldDot: true }
  }

  return { date, dayOfMonth, state: 'available', hasGoldDot: false }
}

export function isDaySelectable(state: DayState): boolean {
  return state === 'available' || state === 'today' || state === 'selected-start' || state === 'in-range'
}

export function hasReservationConflict(
  checkIn: string,
  checkOut: string,
  reservations: Reservation[],
): boolean {
  return reservations.some(r =>
    r.status === 'active' &&
    r.check_in < checkOut &&
    r.check_out > checkIn
  )
}
