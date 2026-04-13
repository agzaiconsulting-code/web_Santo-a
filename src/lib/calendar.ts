// src/lib/calendar.ts
import { isDateInRange, todayISO } from '@/lib/utils'
import type { Reservation, User } from '@/types'

export type DayState =
  | 'past'           // anterior a hoy — no seleccionable, opacidad reducida
  | 'reserved'       // cubierto por reserva activa — muestra nombre, no seleccionable
  | 'august-blocked' // agosto + familia incorrecta — rayas grises, no seleccionable
  | 'quota-full'     // cuota de 30 noches agotada — rayas suaves, no seleccionable
  | 'selected-start' // inicio del rango seleccionado — fondo navy
  | 'selected-end'   // fin del rango seleccionado — fondo navy
  | 'in-range'       // dentro del rango seleccionado — fondo dorado suave
  | 'today'          // hoy — punto dorado (disponible y seleccionable)
  | 'available'      // disponible — seleccionable

export interface DayInfo {
  date: string        // 'YYYY-MM-DD'
  dayOfMonth: number
  state: DayState
  hasGoldDot: boolean // true cuando es hoy (se superpone al estado principal)
  reserverName?: string // solo cuando state === 'reserved'
}

export function getDayInfo(
  date: string,
  dayOfMonth: number,
  reservations: Reservation[],
  currentUser: User,
  augustFamilyId: string | null,
  quotaUsed: number,
  selectedStart: string | null,
  selectedEnd: string | null,
): DayInfo {
  const today = todayISO()
  const hasGoldDot = date === today

  // 1. Pasado (excluyendo hoy)
  if (date < today) {
    return { date, dayOfMonth, state: 'past', hasGoldDot: false }
  }

  // 2. Reservado: alguna reserva activa cubre este día
  const coveringReservation = reservations.find(r =>
    r.status === 'active' && isDateInRange(date, r.check_in, r.check_out)
  )
  if (coveringReservation) {
    const u = coveringReservation.user
    const reserverName = u ? `${u.first_name} ${u.last_name}` : 'Reservado'
    return { date, dayOfMonth, state: 'reserved', hasGoldDot, reserverName }
  }

  // 3. Agosto bloqueado: mes 8 y la familia del usuario no es la asignada
  const isAugust = date.substring(5, 7) === '08'
  if (isAugust && augustFamilyId !== null && currentUser.family_id !== augustFamilyId) {
    return { date, dayOfMonth, state: 'august-blocked', hasGoldDot }
  }

  // 4. Cuota familiar agotada (solo aplica a días futuros no reservados)
  if (quotaUsed >= 30) {
    return { date, dayOfMonth, state: 'quota-full', hasGoldDot }
  }

  // 5. Selección activa
  if (date === selectedStart) {
    return { date, dayOfMonth, state: 'selected-start', hasGoldDot }
  }
  if (date === selectedEnd) {
    return { date, dayOfMonth, state: 'selected-end', hasGoldDot }
  }
  if (selectedStart && selectedEnd && date > selectedStart && date < selectedEnd) {
    return { date, dayOfMonth, state: 'in-range', hasGoldDot }
  }

  // 6. Hoy disponible
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
