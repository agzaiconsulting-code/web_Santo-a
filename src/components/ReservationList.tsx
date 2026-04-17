// src/components/ReservationList.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateLong, formatPrice } from '@/lib/utils'
import { CancelConfirmModal } from '@/components/CancelConfirmModal'
import type { Reservation, User } from '@/types'

interface ReservationListProps {
  activeReservations: Reservation[]
  pastReservations:   Reservation[]
  isAdmin?:           boolean
  allUsers?:          User[]
}

export function ReservationList({
  activeReservations,
  pastReservations,
  isAdmin = false,
  allUsers = [],
}: ReservationListProps) {
  const router = useRouter()
  const [cancelTarget,    setCancelTarget]    = useState<Reservation | null>(null)
  const [isLoading,       setIsLoading]       = useState(false)
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null)
  const [selectedUserId,  setSelectedUserId]  = useState('')

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

      {/* Sección admin: crear reserva para familiar */}
      {isAdmin && (
        <section className="bg-white border border-border rounded-xl p-4 shadow-card space-y-3">
          <h2 className="font-display text-lg font-semibold text-navy">Nueva reserva para familiar</h2>
          <p className="text-sm text-muted">Selecciona el familiar y accede al calendario para elegir fechas.</p>
          <div className="flex gap-3 flex-wrap">
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="flex-1 min-w-[200px] border border-border rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              <option value="">Selecciona un familiar...</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                  {(u as unknown as { family?: { name: string } | null }).family?.name
                    ? ` (${(u as unknown as { family: { name: string } }).family.name})`
                    : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedUserId && router.push(`/calendario?for=${selectedUserId}`)}
              disabled={!selectedUserId}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ir al calendario
            </button>
          </div>
        </section>
      )}

      {/* Reservas activas */}
      <section>
        <h2 className="font-display text-xl font-semibold text-navy mb-4">
          {isAdmin ? 'Todas las reservas activas' : 'Reservas activas'}
        </h2>
        {activeReservations.length === 0 ? (
          <p className="text-muted text-sm">No hay reservas activas.</p>
        ) : (
          <div className="space-y-3">
            {activeReservations.map(r => (
              <ReservationCard
                key={r.id}
                reservation={r}
                showFamily={isAdmin}
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
              <ReservationCard
                key={r.id}
                reservation={r}
                showFamily={isAdmin}
              />
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
  showFamily = false,
  onCancel,
}: {
  reservation: Reservation
  showFamily?: boolean
  onCancel?: () => void
}) {
  const isActive = reservation.status === 'active'
  const isFuture = reservation.check_in >= new Date().toISOString().split('T')[0]
  const familyName = (reservation.user as unknown as { family?: { name: string } | null } | undefined)?.family?.name

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-card flex flex-col sm:flex-row sm:items-center gap-4 ${
      isActive ? 'border-border' : 'border-border opacity-60'
    }`}>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isActive ? 'Activa' : 'Cancelada'}
          </span>
          {showFamily && reservation.user && (
            <span className="text-xs text-muted">
              {reservation.user.first_name} {reservation.user.last_name}
              {familyName ? ` · ${familyName}` : ''}
            </span>
          )}
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
