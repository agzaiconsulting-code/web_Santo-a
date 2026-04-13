'use client'

import { formatDateLong, calcNights, formatPrice } from '@/lib/utils'

interface ReservationConfirmModalProps {
  checkIn: string    // 'YYYY-MM-DD'
  checkOut: string   // 'YYYY-MM-DD'
  onConfirm: () => Promise<void>
  onCancel: () => void
  isLoading: boolean
}

export function ReservationConfirmModal({
  checkIn,
  checkOut,
  onConfirm,
  onCancel,
  isLoading,
}: ReservationConfirmModalProps) {
  const nights = calcNights(checkIn, checkOut)
  const price = formatPrice(nights * 30)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-card border border-border w-full max-w-md p-6 animate-fade-in">
        <h2 className="font-display text-xl font-bold text-navy mb-1">Confirmar reserva</h2>
        <p className="text-sm text-muted mb-6">Revisa los detalles antes de confirmar</p>

        <div className="space-y-3 mb-6">
          <Row label="Entrada" value={formatDateLong(checkIn)} />
          <Row label="Salida" value={formatDateLong(checkOut)} />
          <Row label="Noches" value={`${nights} noches`} />
          <div className="border-t border-border pt-3">
            <Row label="Total" value={price} highlight />
          </div>
        </div>

        <p className="text-xs text-muted bg-stone rounded-lg p-3 mb-5">
          El pago de <strong>{price}</strong> se realiza por transferencia bancaria fuera de la app.
          Una vez confirmado, la reserva quedará registrada de forma inmediata.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg border border-border text-navy text-sm font-medium hover:bg-stone transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Reservando…' : 'Confirmar reserva'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-gold font-semibold text-base' : 'text-navy'}`}>
        {value}
      </span>
    </div>
  )
}
