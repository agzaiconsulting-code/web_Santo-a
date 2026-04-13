'use client'

import { formatDateLong } from '@/lib/utils'
import type { Reservation } from '@/types'

interface CancelConfirmModalProps {
  reservation: Reservation
  onConfirm: () => Promise<void>
  onCancel: () => void
  isLoading: boolean
}

export function CancelConfirmModal({
  reservation,
  onConfirm,
  onCancel,
  isLoading,
}: CancelConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-card border border-border w-full max-w-md p-6 animate-fade-in">
        <h2 className="font-display text-xl font-bold text-navy mb-1">Cancelar reserva</h2>
        <p className="text-sm text-muted mb-6">Esta acción no se puede deshacer</p>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-muted">Entrada</span>
            <span className="text-sm font-medium text-navy">{formatDateLong(reservation.check_in)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Salida</span>
            <span className="text-sm font-medium text-navy">{formatDateLong(reservation.check_out)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Noches</span>
            <span className="text-sm font-medium text-navy">{reservation.nights} noches</span>
          </div>
        </div>

        <p className="text-xs text-muted bg-stone rounded-lg p-3 mb-5">
          Sin reembolso salvo sustitución del período o causa de fuerza mayor (ver normas).
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg border border-border text-navy text-sm font-medium hover:bg-stone transition-colors disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Cancelando…' : 'Sí, cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}
