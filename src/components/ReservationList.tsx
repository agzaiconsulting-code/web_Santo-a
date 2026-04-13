'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateLong, formatPrice } from '@/lib/utils'
import { CancelConfirmModal } from '@/components/CancelConfirmModal'
import type { Reservation } from '@/types'

interface ReservationListProps {
  activeReservations: Reservation[]
  pastReservations: Reservation[]
}

export function ReservationList({ activeReservations, pastReservations }: ReservationListProps) {
  const router = useRouter()
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)
  const [isLoading, setIsLoading]       = useState(false)
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)

  async function handleCancel() {
    if (!cancelTarget) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/reservations/${cancelTarget.id}`, { method: 'PATCH' })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Error al cancelar la reserva')
        setCancelTarget(null)
        return
      }

      setCancelTarget(null)
      router.refresh()
    } catch {
      setErrorMsg('Error de conexión. Inténtalo de nuevo.')
      setCancelTarget(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
          {errorMsg}
        </div>
      )}

      {/* Reservas activas */}
      <section>
        <h2 className="font-display text-xl font-semibold text-navy mb-4">Reservas activas</h2>
        {activeReservations.length === 0 ? (
          <p className="text-muted text-sm">No tienes reservas activas.</p>
        ) : (
          <div className="space-y-3">
            {activeReservations.map(r => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onCancel={() => setCancelTarget(r)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Historial */}
      {pastReservations.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-navy mb-4">Historial</h2>
          <div className="space-y-3">
            {pastReservations.map(r => (
              <ReservationCard key={r.id} reservation={r} />
            ))}
          </div>
        </section>
      )}

      {cancelTarget && (
        <CancelConfirmModal
          reservation={cancelTarget}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: Reservation
  onCancel?: () => void
}) {
  const isActive    = reservation.status === 'active'
  const isFuture    = reservation.check_in >= new Date().toISOString().split('T')[0]

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-card flex flex-col sm:flex-row sm:items-center gap-4 ${isActive ? 'border-border' : 'border-border opacity-60'}`}>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-stone text-muted'
          }`}>
            {isActive ? 'Activa' : 'Cancelada'}
          </span>
        </div>
        <p className="text-sm font-medium text-navy">
          {formatDateLong(reservation.check_in)} → {formatDateLong(reservation.check_out)}
        </p>
        <p className="text-xs text-muted">
          {reservation.nights} noches · {formatPrice(reservation.total_price)}
        </p>
      </div>

      {isActive && isFuture && onCancel && (
        <button
          onClick={onCancel}
          className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors whitespace-nowrap"
        >
          Cancelar
        </button>
      )}
    </div>
  )
}
