// src/components/ReservationPanel.tsx
'use client'

import { formatDateLong, calcNights, formatPrice, calcPrice } from '@/lib/utils'
import type { User } from '@/types'

interface ReservationPanelProps {
  selectedStart: string | null
  selectedEnd:   string | null
  forUser?:      User
  onConfirm:     () => Promise<void>
  onCancel:      () => void
  isLoading:     boolean
  errorMsg:      string | null
}

export function ReservationPanel({
  selectedStart, selectedEnd, forUser,
  onConfirm, onCancel, isLoading, errorMsg,
}: ReservationPanelProps) {
  const hasRange = !!(selectedStart && selectedEnd)
  const nights   = hasRange ? calcNights(selectedStart!, selectedEnd!) : 0
  const price    = hasRange ? formatPrice(calcPrice(nights)) : ''

  return (
    <div className="bg-white border border-border rounded-xl shadow-card sticky top-20">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-display text-lg font-bold text-navy">Nueva reserva</h2>
        {forUser ? (
          <p className="text-sm text-muted mt-0.5">
            Para: <span className="font-medium text-navy">
              {forUser.first_name} {forUser.last_name}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted mt-0.5">
            {selectedStart && !selectedEnd
              ? `Entrada: ${formatDateLong(selectedStart)}`
              : 'Selecciona las fechas en el calendario'}
          </p>
        )}
      </div>

      {/* Body — vacío */}
      {!hasRange && (
        <div className="p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[180px]">
          <div className="text-4xl opacity-30">📅</div>
          <p className="text-sm text-muted leading-relaxed">
            {selectedStart
              ? 'Ahora selecciona el día de salida'
              : 'Haz clic en el día de entrada para comenzar'}
          </p>
        </div>
      )}

      {/* Body — con rango */}
      {hasRange && (
        <div className="p-4 space-y-3">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          <Row label="Entrada" value={formatDateLong(selectedStart!)} />
          <Row label="Salida"  value={formatDateLong(selectedEnd!)}   />
          <Row label="Noches"  value={`${nights} noches`}             />

          <div className="border-t border-border pt-3">
            <Row label="Total" value={price} highlight />
          </div>

          <p className="text-xs text-muted bg-stone rounded-lg p-3 leading-relaxed">
            El pago de <strong>{price}</strong> se realiza por transferencia bancaria fuera de la app.
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Reservando…' : 'Confirmar reserva'}
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-2 text-sm text-muted hover:text-navy transition-colors disabled:opacity-50"
            >
              Cancelar selección
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label, value, highlight = false,
}: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium ${
        highlight ? 'text-gold font-semibold text-base' : 'text-navy'
      }`}>
        {value}
      </span>
    </div>
  )
}
