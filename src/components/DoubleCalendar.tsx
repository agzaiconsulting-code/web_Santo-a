// src/components/DoubleCalendar.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getDayInfo, isDaySelectable, hasReservationConflict, type DayInfo } from '@/lib/calendar'
import { getDaysInMonth, getMonthStartDayOffset, monthName, formatDateLong } from '@/lib/utils'
import { ReservationConfirmModal } from '@/components/ReservationConfirmModal'
import type { Reservation, User } from '@/types'

interface DoubleCalendarProps {
  reservations: Reservation[]
  currentUser: User
  augustFamilyId: string | null
  quotaUsed: number
}

export function DoubleCalendar({
  reservations,
  currentUser,
  augustFamilyId,
  quotaUsed,
}: DoubleCalendarProps) {
  const router = useRouter()
  const now = new Date()

  const [baseYear, setBaseYear]   = useState(now.getFullYear())
  const [baseMonth, setBaseMonth] = useState(now.getMonth() + 1) // 1-indexed

  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd,   setSelectedEnd]   = useState<string | null>(null)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [isLoading,     setIsLoading]     = useState(false)
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null)

  const leftYear  = baseYear
  const leftMonth = baseMonth
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
    setModalOpen(true)
  }, [selectedStart, selectedEnd, reservations])

  async function handleConfirmReservation() {
    if (!selectedStart || !selectedEnd) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_in: selectedStart, check_out: selectedEnd }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Error al crear la reserva')
        setModalOpen(false)
        setSelectedStart(null)
        setSelectedEnd(null)
        return
      }

      setModalOpen(false)
      setSelectedStart(null)
      setSelectedEnd(null)
      router.refresh()
    } catch {
      setErrorMsg('Error de conexión. Inténtalo de nuevo.')
      setModalOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
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

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
          {errorMsg}
        </div>
      )}

      {/* Instrucción */}
      {!selectedStart && (
        <p className="text-sm text-muted text-center">
          Haz clic en el día de entrada para comenzar la selección
        </p>
      )}
      {selectedStart && !selectedEnd && (
        <p className="text-sm text-blue text-center">
          Entrada: <strong>{formatDateLong(selectedStart)}</strong> — ahora selecciona el día de salida
        </p>
      )}

      {/* Dos calendarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthGrid
          year={leftYear}
          month={leftMonth}
          reservations={reservations}
          currentUser={currentUser}
          augustFamilyId={augustFamilyId}
          quotaUsed={quotaUsed}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          onDayClick={handleDayClick}
        />
        <MonthGrid
          year={rightYear}
          month={rightMonth}
          reservations={reservations}
          currentUser={currentUser}
          augustFamilyId={augustFamilyId}
          quotaUsed={quotaUsed}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          onDayClick={handleDayClick}
        />
      </div>

      {/* Leyenda */}
      <Legend />

      {/* Modal */}
      {modalOpen && selectedStart && selectedEnd && (
        <ReservationConfirmModal
          checkIn={selectedStart}
          checkOut={selectedEnd}
          onConfirm={handleConfirmReservation}
          onCancel={() => { setModalOpen(false); setSelectedStart(null); setSelectedEnd(null) }}
          isLoading={isLoading}
        />
      )}
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
  quotaUsed: number
  selectedStart: string | null
  selectedEnd: string | null
  onDayClick: (date: string, info: DayInfo) => void
}

function MonthGrid({
  year, month, reservations, currentUser, augustFamilyId,
  quotaUsed, selectedStart, selectedEnd, onDayClick,
}: MonthGridProps) {
  const days = getDaysInMonth(year, month)
  const offset = getMonthStartDayOffset(year, month) // 0=Lunes

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

      {/* Grid de días */}
      <div className="grid grid-cols-7">
        {/* Celdas vacías para alinear el primer día */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map(({ date, dayOfMonth }) => {
          const info = getDayInfo(
            date, dayOfMonth, reservations, currentUser,
            augustFamilyId, quotaUsed, selectedStart, selectedEnd,
          )
          return (
            <DayCell
              key={date}
              info={info}
              onClick={() => onDayClick(date, info)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ---- DayCell ----

function DayCell({ info, onClick }: { info: DayInfo; onClick: () => void }) {
  const { state, dayOfMonth, hasGoldDot, reserverName } = info
  const selectable = isDaySelectable(state)

  const baseClass = 'relative flex items-center justify-center h-9 w-full text-sm rounded-lg transition-colors'

  const stateClasses: Record<typeof state, string> = {
    'past':           'text-muted/40 cursor-not-allowed',
    'reserved':       'bg-blue/15 text-blue cursor-not-allowed',
    'august-blocked': 'cursor-not-allowed text-muted/60',
    'quota-full':     'cursor-not-allowed text-muted/60',
    'selected-start': 'bg-navy text-white font-semibold cursor-pointer',
    'selected-end':   'bg-navy text-white font-semibold cursor-pointer',
    'in-range':       'bg-gold/25 text-navy cursor-pointer',
    'today':          'text-navy font-medium cursor-pointer hover:bg-blue/10',
    'available':      'text-navy cursor-pointer hover:bg-blue/10',
  }

  const stripedStyle =
    state === 'august-blocked'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(106,122,136,0.15) 4px, rgba(106,122,136,0.15) 8px)' }
      : state === 'quota-full'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(196,148,58,0.12) 4px, rgba(196,148,58,0.12) 8px)' }
      : undefined

  return (
    <div
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? onClick : undefined}
      onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      title={reserverName}
      className={`${baseClass} ${stateClasses[state]}`}
      style={stripedStyle}
    >
      {dayOfMonth}
      {hasGoldDot && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold" />
      )}
      {state === 'reserved' && reserverName && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] leading-none text-blue/80 truncate max-w-full px-0.5">
          {reserverName.split(' ')[0]}
        </span>
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
      <LegendItem striped="quota" label="Cuota agotada" />
    </div>
  )
}

function LegendItem({
  color, label, textWhite, striped,
}: {
  color?: string
  label: string
  textWhite?: boolean
  striped?: 'august' | 'quota'
}) {
  const stripedStyle =
    striped === 'august'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(106,122,136,0.3) 4px, rgba(106,122,136,0.3) 8px)', width: 16, height: 16 }
      : striped === 'quota'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(196,148,58,0.3) 4px, rgba(196,148,58,0.3) 8px)', width: 16, height: 16 }
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
