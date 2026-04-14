// src/components/AugustAssignment.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Family } from '@/types'

interface AugustAssignmentProps {
  year:            number
  families:        Family[]
  currentFamilyId: string | null
}

export function AugustAssignment({ year, families, currentFamilyId }: AugustAssignmentProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(currentFamilyId ?? '')
  const [isLoading,  setIsLoading]  = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  const currentName = families.find(f => f.id === currentFamilyId)?.name ?? '—'
  const isDirty = selectedId !== (currentFamilyId ?? '')

  async function handleSave() {
    if (!selectedId || !isDirty) return
    setIsLoading(true)
    setErrorMsg(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/august', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, family_id: selectedId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Error al guardar')
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setErrorMsg('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-card space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-navy">Familia de agosto</h2>
        <p className="text-sm text-muted mt-0.5">
          Asigna qué familia ocupa la casa en agosto {year}.
          {currentFamilyId && (
            <span className="ml-1">Actualmente: <strong className="text-navy">{currentName}</strong>.</span>
          )}
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
          Guardado correctamente.
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); setSuccess(false) }}
          className="flex-1 min-w-[180px] border border-border rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
        >
          <option value="">Selecciona una familia...</option>
          {families.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <button
          onClick={handleSave}
          disabled={!isDirty || !selectedId || isLoading}
          className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
