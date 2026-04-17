// src/components/DoubleCalendar.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getDayInfo, isDaySelectable, hasReservationConflict, type DayInfo } from '@/lib/calendar'
import { getDaysInMonth, getMonthStartDayOffset, monthName } from '@/lib/utils'
import { ReservationPanel } from '@/components/ReservationPanel'
import type { Reservation, User } from '@/types'

interface DoubleCalendarProps {
  reservations:          Reservation[]
  currentUser:           User
  augustFamilyId:        string | null
  forUser?:              User
  hasActiveReservation?: boolean
}

export function DoubleCalendar({
  reservations,
  currentUser,
  augustFamilyId,
  forUser,
  hasActiveReservation = false,
}: DoubleCalendarProps) {
  const router = useRouter()
  const now = new Date()

  const [baseYear, setBaseYear]   = useState(now.getFullYear())
  const [baseMonth, setBaseMonth] = useState(now.getMonth() + 1)

  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd,   setSelectedEnd]   = useState<string | null>(null)
  const [isLoading,     setIsLoading]     = useState(false)
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null)

  const leftYear   = baseYear
  const leftMonth  = baseMonth
  const rightYear  = leftMonth === 12 ? leftYear + 1 : leftYear
  const rightMonth = leftMonth === 12 ? 1 : leftMonth + 1

  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const canGoBack = !(leftYear === currentYear && leftMonth === currentMonth)

  function prevMonth() {
    if (!canGoBack) return
    if (baseMonth === 1) { setBaseYear(y => y - 1); setBaseMonth(12) }
    else setBaseMonth(m => m - 1)
  }

  function nextMonth() {
    if (baseMonth === 12) { setBaseYear(y => y + 1); setBaseMonth(1) }
    else setBaseMonth(m => m + 1)
  }

  const handleDayClick = useCallback((date: string, info: DayInfo) => {
    if (hasActiveReservation) return
    if (!isDaySelectable(info.state)) return
    setErrorMsg(null)

    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(date)
      setSelectedEnd(null)
      return
    }

    if (date <= selectedStart) {
      setSelectedStart(date)
      setSelectedEnd(null)
      return
    }

    if (hasReservationConflict(selectedStart, date, reservations)) {
      setErrorMsg('El rango seleccionado incluye días ya reservados. Elige otro período.')
      setSelectedStart(null)
      setSelectedEnd(null)
      return
    }

    setSelectedEnd(date)
  }, [selectedStart, selectedEnd, reservations, hasActiveReservation])

  async function handleConfirmReservation() {
    if (!selectedStart || !selectedEnd) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in:  selectedStart,
          check_out: selectedEnd,
          ...(forUser ? { for_user_id: forUser.id } : {}),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Error al crear la reserva')
        return  // mantener selección para que el panel muestre el error
      }

      setSelectedStart(null)
      setSelectedEnd(null)
      router.refresh()
    } catch {
      setErrorMsg('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  // La lógica del calendario usa forUser (si está presente) para
  // calcular restricciones de agosto y cuota del familiar objetivo.
  const calendarUser = forUser ?? currentUser

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      {/* Columna izquierda: calendarios */}
      <div className="space-y-4">
        {/* Navegación */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            disabled={!canGoBack}
            className="p-2 rounded-lg hover:bg-stone disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft />
          </button>
          <span className="text-sm font-medium text-muted">
            {monthName(leftMonth)} {leftYear} — {monthName(rightMonth)} {rightYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-stone transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Aviso reserva activa */}
        {hasActiveReservation && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5">
            No puedes realizar otra reserva debido a que tienes una reserva activa.
          </div>
        )}

        {/* Error de rango (sin selección activa) */}
        {errorMsg && !selectedEnd && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
            {errorMsg}
          </div>
        )}

        {/* Dos calendarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthGrid
            year={leftYear}
            month={leftMonth}
            reservations={reservations}
            currentUser={calendarUser}
            augustFamilyId={augustFamilyId}
            selectedStart={selectedStart}
            selectedEnd={selectedEnd}
            onDayClick={handleDayClick}
          />
          <MonthGrid
            year={rightYear}
            month={rightMonth}
            reservations={reservations}
            currentUser={calendarUser}
            augustFamilyId={augustFamilyId}
            selectedStart={selectedStart}
            selectedEnd={selectedEnd}
            onDayClick={handleDayClick}
          />
        </div>

        <Legend />
      </div>

      {/* Columna derecha: panel de confirmación */}
      <ReservationPanel
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        forUser={forUser}
        onConfirm={handleConfirmReservation}
        onCancel={() => { setSelectedStart(null); setSelectedEnd(null); setErrorMsg(null) }}
        isLoading={isLoading}
        errorMsg={selectedEnd ? errorMsg : null}
      />
    </div>
  )
}

// ---- MonthGrid ----

interface MonthGridProps {
  year: number
  month: number
  reservations: Reservation[]
  currentUser: User
  augustFamilyId: string | null
  selectedStart: string | null
  selectedEnd: string | null
  onDayClick: (date: string, info: DayInfo) => void
}

type Slot = { date: string; dayOfMonth: number } | null

function buildWeeks(days: { date: string; dayOfMonth: number }[], offset: number): Slot[][] {
  const totalSlots = offset + days.length
  const numWeeks   = Math.ceil(totalSlots / 7)
  const weeks: Slot[][] = []
  for (let w = 0; w < numWeeks; w++) {
    const week: Slot[] = []
    for (let d = 0; d < 7; d++) {
      const dayIndex = w * 7 + d - offset
      week.push(dayIndex >= 0 && dayIndex < days.length ? days[dayIndex] : null)
    }
    weeks.push(week)
  }
  return weeks
}

function MonthGrid({
  year, month, reservations, currentUser, augustFamilyId,
  selectedStart, selectedEnd, onDayClick,
}: MonthGridProps) {
  const days  = getDaysInMonth(year, month)
  const weeks = buildWeeks(days, getMonthStartDayOffset(year, month))

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-card">
      <h3 className="font-display text-center font-semibold text-navy mb-4">
        {monthName(month)} {year}
      </h3>

      {/* Cabecera días de la semana */}
      <div className="grid grid-cols-7 mb-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted py-1">{d}</div>
        ))}
      </div>

      {/* Filas semanales */}
      {weeks.map((week, wi) => (
        <WeekRow
          key={wi}
          slots={week}
          reservations={reservations}
          currentUser={currentUser}
          augustFamilyId={augustFamilyId}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  )
}

// ---- WeekRow ----

interface WeekRowProps {
  slots: Slot[]
  reservations: Reservation[]
  currentUser: User
  augustFamilyId: string | null
  selectedStart: string | null
  selectedEnd: string | null
  onDayClick: (date: string, info: DayInfo) => void
}

function nextDayISO(date: string): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function WeekRow({
  slots, reservations, currentUser, augustFamilyId,
  selectedStart, selectedEnd, onDayClick,
}: WeekRowProps) {
  const cells: React.ReactNode[] = []
  let i = 0

  while (i < 7) {
    const slot = slots[i]

    if (!slot) {
      cells.push(<div key={`empty-${i}`} />)
      i++
      continue
    }

    const info = getDayInfo(slot.date, slot.dayOfMonth, reservations, currentUser, augustFamilyId, [], selectedStart, selectedEnd)

    if (info.state === 'reserved' && info.reservationId) {
      // Contar días consecutivos de la misma reserva en esta semana
      let span = 1
      while (i + span < 7) {
        const next = slots[i + span]
        if (!next) break
        const nextInfo = getDayInfo(next.date, next.dayOfMonth, reservations, currentUser, augustFamilyId, [], selectedStart, selectedEnd)
        if (nextInfo.state === 'reserved' && nextInfo.reservationId === info.reservationId) {
          span++
        } else {
          break
        }
      }

      const reservation = reservations.find(r => r.id === info.reservationId)
      const lastSlot    = slots[i + span - 1]!
      const isStart     = !!reservation && slot.date === reservation.check_in
      const isEnd       = (i + span < 7) ||
        !reservation ||
        nextDayISO(lastSlot.date) >= reservation.check_out

      const dayNumbers = slots.slice(i, i + span).map(s => s!.dayOfMonth)

      cells.push(
        <ReservationSpan
          key={slot.date}
          span={span}
          dayNumbers={dayNumbers}
          reserverName={info.reserverName ?? 'Reservado'}
          isStart={isStart}
          isEnd={isEnd}
        />
      )
      i += span
    } else {
      cells.push(
        <DayCell
          key={slot.date}
          info={info}
          onClick={() => onDayClick(slot.date, info)}
        />
      )
      i++
    }
  }

  return <div className="grid grid-cols-7">{cells}</div>
}

// ---- ReservationSpan ----

function ReservationSpan({
  span, dayNumbers, reserverName, isStart, isEnd,
}: {
  span: number
  dayNumbers: number[]
  reserverName: string
  isStart: boolean
  isEnd: boolean
}) {
  const rounded =
    isStart && isEnd ? 'rounded-lg' :
    isStart          ? 'rounded-l-lg' :
    isEnd            ? 'rounded-r-lg' : ''

  return (
    <div
      style={{ gridColumn: `span ${span}` }}
      title={reserverName}
      className={`relative h-16 bg-blue/15 cursor-not-allowed overflow-hidden ${rounded}`}
    >
      {/* Números de día en cada posición */}
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${span}, 1fr)` }}
      >
        {dayNumbers.map((d, idx) => (
          <div key={idx} className="flex items-center justify-center text-sm text-blue/80">
            {d}
          </div>
        ))}
      </div>

      {/* Nombre centrado en la franja inferior */}
      <div className="absolute bottom-0.5 inset-x-0 flex justify-center pointer-events-none">
        <span className="text-[11px] leading-none text-blue/80 font-medium truncate px-1">
          {reserverName}
        </span>
      </div>
    </div>
  )
}

// ---- DayCell ----

function DayCell({ info, onClick }: { info: DayInfo; onClick: () => void }) {
  const { state, dayOfMonth, hasGoldDot } = info
  const selectable = isDaySelectable(state)

  const baseClass = 'relative flex items-center justify-center h-16 w-full text-sm rounded-lg transition-colors'

  const stateClasses: Record<typeof state, string> = {
    'past':           'text-muted/40 cursor-not-allowed',
    'reserved':       'bg-blue/15 text-blue cursor-not-allowed',
    'august-blocked': 'cursor-not-allowed text-muted/60',
    'selected-start': 'bg-navy text-white font-semibold cursor-pointer',
    'selected-end':   'bg-navy text-white font-semibold cursor-pointer',
    'in-range':       'bg-gold/25 text-navy cursor-pointer',
    'today':          'text-navy font-medium cursor-pointer hover:bg-blue/10',
    'available':      'text-navy cursor-pointer hover:bg-blue/10',
  }

  const stripedStyle =
    state === 'august-blocked'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(106,122,136,0.15) 4px, rgba(106,122,136,0.15) 8px)' }
      : undefined

  return (
    <div
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? onClick : undefined}
      onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={`${baseClass} ${stateClasses[state]}`}
      style={stripedStyle}
    >
      {dayOfMonth}
      {hasGoldDot && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold" />
      )}
    </div>
  )
}

// ---- Leyenda ----

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-muted mt-2">
      <LegendItem color="bg-blue/15" label="Reservado" />
      <LegendItem color="bg-navy" label="Seleccionado" textWhite />
      <LegendItem color="bg-gold/25" label="En rango" />
      <LegendItem striped="august" label="Agosto bloqueado" />
    </div>
  )
}

function LegendItem({
  color, label, textWhite, striped,
}: {
  color?: string
  label: string
  textWhite?: boolean
  striped?: 'august'
}) {
  const stripedStyle =
    striped === 'august'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(106,122,136,0.3) 4px, rgba(106,122,136,0.3) 8px)', width: 16, height: 16 }
      : undefined

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-4 h-4 rounded ${color ?? ''} ${textWhite ? 'text-white' : ''}`}
        style={stripedStyle}
      />
      <span>{label}</span>
    </div>
  )
}

// ---- Iconos ----

function ChevronLeft() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
