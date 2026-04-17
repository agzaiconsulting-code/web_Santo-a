// src/components/AdminTabs.tsx
'use client'

import { useState } from 'react'
import { formatDateLong, formatPrice } from '@/lib/utils'
import type { Reservation } from '@/types'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface AdminTabsProps {
  reservations:  Reservation[]
  initialMonth:  number  // 1-indexed
}

export function AdminTabs({ reservations, initialMonth }: AdminTabsProps) {
  const [activeMonth, setActiveMonth] = useState(initialMonth)

  const byMonth = (m: number) =>
    reservations.filter(r => Number(r.check_in.slice(5, 7)) === m)

  const monthReservations = byMonth(activeMonth)
  const activeCount = monthReservations.filter(r => r.status === 'active').length
  const totalNights = monthReservations
    .filter(r => r.status === 'active')
    .reduce((s, r) => s + r.nights, 0)
  const totalIncome = monthReservations
    .filter(r => r.status === 'active')
    .reduce((s, r) => s + r.total_price, 0)

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1">
        {MONTHS.map((label, i) => {
          const m = i + 1
          const hasReservations = byMonth(m).length > 0
          return (
            <button
              key={m}
              onClick={() => setActiveMonth(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative ${
                activeMonth === m
                  ? 'bg-navy text-white'
                  : 'bg-white border border-border text-muted hover:text-navy'
              }`}
            >
              {label}
              {hasReservations && activeMonth !== m && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold" />
              )}
            </button>
          )
        })}
      </div>

      {/* Resumen del mes */}
      {monthReservations.length > 0 && (
        <div className="flex gap-4 text-sm text-muted">
          <span><strong className="text-navy">{activeCount}</strong> activas</span>
          <span><strong className="text-navy">{totalNights}</strong> noches</span>
          <span><strong className="text-navy">{formatPrice(totalIncome)}</strong></span>
        </div>
      )}

      {/* Tabla */}
      {monthReservations.length === 0 ? (
        <p className="text-muted text-sm py-4">No hay reservas en {MONTHS[activeMonth - 1]}.</p>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-x-auto shadow-card">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-stone/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Persona</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Familia</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Entrada</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Salida</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Noches</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody>
              {monthReservations
                .sort((a, b) => a.check_in.localeCompare(b.check_in))
                .map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-stone/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-navy">
                      {r.user ? `${r.user.first_name} ${r.user.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {(r.user as unknown as { family?: { name: string } | null })?.family?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">{formatDateLong(r.check_in)}</td>
                    <td className="px-4 py-3">{formatDateLong(r.check_out)}</td>
                    <td className="px-4 py-3 text-right">{r.nights}</td>
                    <td className="px-4 py-3 text-right">{formatPrice(r.total_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {r.status === 'active' ? 'Activa' : 'Cancelada'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
