# Admin Dashboard + Panel Lateral de Reserva

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modal de confirmación de reserva por un panel lateral fijo, añadir vista admin en `/reservas` (todas las reservas, crear para familiar), y crear la página `/admin` con dashboard de métricas y tabla por mes.

**Architecture:** Tres cambios coordinados. (1) `ReservationPanel` reemplaza `ReservationConfirmModal` — vive a la derecha del calendario en un grid 2 columnas. (2) `/reservas` detecta `role === 'admin'` en el servidor y pasa props adicionales al Client Component. (3) `/admin` carga todos los datos en el servidor y delega el filtro por mes al Client Component `AdminTabs`. Las APIs existentes se amplían con `for_user_id` opcional para que el admin pueda crear reservas a nombre de un familiar.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v3, @clerk/nextjs v5, @supabase/supabase-js v2

---

## Mapa de archivos

| Archivo | Cambio |
|---|---|
| `src/components/ReservationPanel.tsx` | Nuevo — panel lateral de confirmación |
| `src/components/ReservationConfirmModal.tsx` | Eliminar al final |
| `src/components/DoubleCalendar.tsx` | Modificar — usar ReservationPanel, prop `forUser`, nuevo layout |
| `src/types/index.ts` | Modificar — `for_user_id?` en `CreateReservationRequest` |
| `src/app/api/reservations/route.ts` | Modificar — soportar `for_user_id` |
| `src/app/calendario/page.tsx` | Modificar — leer `searchParams.for`, pasar `forUser` |
| `src/components/AdminTabs.tsx` | Nuevo — tabs por mes + tabla (Client Component) |
| `src/app/admin/page.tsx` | Nuevo — dashboard stats + AdminTabs |
| `src/components/ReservationList.tsx` | Modificar — vista admin con dropdown + tabla |
| `src/app/reservas/page.tsx` | Modificar — cargar datos admin si `role === 'admin'` |
| `src/components/Header.tsx` | Modificar — enlace /admin para admins |

---

## Task 1: Componente ReservationPanel

**Files:**
- Create: `src/components/ReservationPanel.tsx`

- [ ] **Crear el archivo**

```typescript
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
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Commit**

```bash
git add src/components/ReservationPanel.tsx
git commit -m "feat: componente ReservationPanel — panel lateral de confirmación"
```

---

## Task 2: Refactorizar DoubleCalendar

**Files:**
- Modify: `src/components/DoubleCalendar.tsx`

- [ ] **Actualizar imports y props**

Reemplazar las primeras líneas del archivo:

```typescript
// src/components/DoubleCalendar.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getDayInfo, isDaySelectable, hasReservationConflict, type DayInfo } from '@/lib/calendar'
import { getDaysInMonth, getMonthStartDayOffset, monthName, formatDateLong } from '@/lib/utils'
import { ReservationPanel } from '@/components/ReservationPanel'
import type { Reservation, User } from '@/types'

interface DoubleCalendarProps {
  reservations:   Reservation[]
  currentUser:    User
  augustFamilyId: string | null
  quotaUsed:      number
  forUser?:       User   // si está presente, el admin crea la reserva para este familiar
}

export function DoubleCalendar({
  reservations,
  currentUser,
  augustFamilyId,
  quotaUsed,
  forUser,
}: DoubleCalendarProps) {
```

- [ ] **Eliminar estado `modalOpen` y actualizar `handleDayClick`**

Reemplazar el bloque de estados y `handleDayClick`:

```typescript
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
  }, [selectedStart, selectedEnd, reservations])
```

- [ ] **Actualizar `handleConfirmReservation`**

Reemplazar la función por esta versión (incluye `for_user_id` y no limpia selección en error para que el panel muestre el error):

```typescript
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
```

- [ ] **Actualizar el JSX de retorno**

Reemplazar todo el bloque `return (...)` de `DoubleCalendar`:

```typescript
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
            quotaUsed={quotaUsed}
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
            quotaUsed={quotaUsed}
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
```

- [ ] **Verificar compilación y tests**

```bash
npx tsc --noEmit && npm run test
```

Expected: sin errores TypeScript, 54 tests passing.

- [ ] **Commit**

```bash
git add src/components/DoubleCalendar.tsx
git commit -m "feat: DoubleCalendar con panel lateral, elimina modal popup"
```

---

## Task 3: Tipo + API para crear reserva como admin

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/app/api/reservations/route.ts`

- [ ] **Añadir `for_user_id` al tipo `CreateReservationRequest`**

En `src/types/index.ts`, reemplazar:

```typescript
export interface CreateReservationRequest {
  check_in: string  // 'YYYY-MM-DD'
  check_out: string // 'YYYY-MM-DD'
}
```

Por:

```typescript
export interface CreateReservationRequest {
  check_in:     string  // 'YYYY-MM-DD'
  check_out:    string  // 'YYYY-MM-DD'
  for_user_id?: string  // admin only: crear reserva para este usuario interno
}
```

- [ ] **Actualizar `POST /api/reservations`**

Reemplazar el contenido de `src/app/api/reservations/route.ts`:

```typescript
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import type { CreateReservationRequest, CreateReservationResponse, ApiError } from '@/types'

export async function POST(req: Request): Promise<Response> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return Response.json({ error: 'No autenticado' } satisfies ApiError, { status: 401 })
  }

  let body: CreateReservationRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' } satisfies ApiError, { status: 400 })
  }

  const { check_in, check_out, for_user_id } = body
  if (!check_in || !check_out) {
    return Response.json({ error: 'check_in y check_out son obligatorios' } satisfies ApiError, { status: 400 })
  }

  const supabase = createAdminClient()

  // Caller
  const { data: caller, error: callerError } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (callerError || !caller) {
    return Response.json({ error: 'Usuario no encontrado en el sistema' } satisfies ApiError, { status: 404 })
  }

  // Si se pasa for_user_id, verificar que el caller es admin
  if (for_user_id && caller.role !== 'admin') {
    return Response.json({ error: 'No autorizado' } satisfies ApiError, { status: 403 })
  }

  const targetUserId = for_user_id ?? caller.id

  const { data: reservationId, error: rpcError } = await supabase
    .rpc('create_reservation', {
      p_user_id:   targetUserId,
      p_check_in:  check_in,
      p_check_out: check_out,
    })

  if (rpcError) {
    return Response.json({ error: rpcError.message } satisfies ApiError, { status: 400 })
  }

  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('id, check_in, check_out, nights, total_price')
    .eq('id', reservationId)
    .single()

  if (fetchError || !reservation) {
    return Response.json({ error: 'Error al recuperar la reserva creada' } satisfies ApiError, { status: 500 })
  }

  return Response.json(reservation satisfies CreateReservationResponse, { status: 201 })
}
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Commit**

```bash
git add src/types/index.ts src/app/api/reservations/route.ts
git commit -m "feat: API reservations acepta for_user_id para crear como admin"
```

---

## Task 4: Página /calendario con soporte ?for=<userId>

**Files:**
- Modify: `src/app/calendario/page.tsx`

- [ ] **Reescribir la página**

```typescript
// src/app/calendario/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { DoubleCalendar } from '@/components/DoubleCalendar'
import { FamilyQuotaIndicator } from '@/components/FamilyQuotaIndicator'
import type { Reservation, User } from '@/types'

export const metadata: Metadata = { title: 'Calendario' }

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { for?: string }
}) {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at, family:families(id, name, created_at)')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!currentUser) redirect('/sign-in')

  const user = currentUser as unknown as User & { family: { id: string; name: string; created_at: string } | null }

  // Cargar forUser si el admin pasa ?for=<userId>
  let forUser: User | null = null
  if (searchParams.for && user.role === 'admin') {
    const { data: targetRaw } = await supabase
      .from('users')
      .select('id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at, family:families(id, name, created_at)')
      .eq('id', searchParams.for)
      .single()
    if (!targetRaw) redirect('/reservas')
    forUser = targetRaw as unknown as User
  }

  // El usuario efectivo para cuota y restricciones de agosto
  const effectiveUser = forUser ?? user

  const currentYear = new Date().getFullYear()

  const [
    { data: reservationsRaw },
    { data: augustAssignment },
    { data: quota },
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at, user:users(id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at)')
      .eq('status', 'active')
      .order('check_in'),
    supabase
      .from('august_assignments')
      .select('family_id')
      .eq('year', currentYear)
      .maybeSingle(),
    effectiveUser.family_id
      ? supabase.rpc('get_family_quota', { p_family_id: effectiveUser.family_id })
      : Promise.resolve({ data: 0, error: null }),
  ])

  const reservations = (reservationsRaw ?? []) as unknown as Reservation[]
  const quotaUsed    = (quota as number | null) ?? 0
  const familyName   = (effectiveUser as User & { family?: { name: string } | null }).family?.name ?? 'Tu familia'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Calendario</h1>
        <p className="text-muted text-sm mt-1">
          Selecciona las fechas de entrada y salida para hacer una reserva
        </p>
      </div>

      {effectiveUser.family_id ? (
        <FamilyQuotaIndicator familyName={familyName} usedNights={quotaUsed} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          Tu cuenta todavía no tiene una familia asignada. Contacta con el administrador para poder hacer reservas.
        </div>
      )}

      <DoubleCalendar
        reservations={reservations}
        currentUser={user}
        augustFamilyId={augustAssignment?.family_id ?? null}
        quotaUsed={quotaUsed}
        forUser={forUser ?? undefined}
      />
    </div>
  )
}
```

- [ ] **Verificar compilación y tests**

```bash
npx tsc --noEmit && npm run test
```

Expected: sin errores, 54 tests passing.

- [ ] **Commit**

```bash
git add src/app/calendario/page.tsx
git commit -m "feat: /calendario acepta ?for=userId para que admin cree reservas"
```

---

## Task 5: Componente AdminTabs

**Files:**
- Create: `src/components/AdminTabs.tsx`

- [ ] **Crear el archivo**

```typescript
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
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-card">
          <table className="w-full text-sm">
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
                          : 'bg-stone text-muted'
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
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Commit**

```bash
git add src/components/AdminTabs.tsx
git commit -m "feat: componente AdminTabs — tabla de reservas filtrada por mes"
```

---

## Task 6: Página /admin

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Crear la página**

```typescript
// src/app/admin/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { AdminTabs } from '@/components/AdminTabs'
import { formatPrice } from '@/lib/utils'
import type { Reservation } from '@/types'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminPage() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!currentUser || currentUser.role !== 'admin') redirect('/')

  const currentYear = new Date().getFullYear()

  const [
    { data: reservationsRaw },
    { data: augustAssignment },
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at, user:users(id, first_name, last_name, family:families(name))')
      .gte('check_in', `${currentYear}-01-01`)
      .lte('check_in', `${currentYear}-12-31`)
      .order('check_in'),
    supabase
      .from('august_assignments')
      .select('family_id, family:families(name)')
      .eq('year', currentYear)
      .maybeSingle(),
  ])

  const reservations = (reservationsRaw ?? []) as unknown as Reservation[]

  // Calcular stats
  const activeReservations = reservations.filter(r => r.status === 'active')
  const totalNights  = activeReservations.reduce((s, r) => s + r.nights, 0)
  const totalIncome  = activeReservations.reduce((s, r) => s + r.total_price, 0)
  const augustFamily = (augustAssignment as unknown as { family?: { name: string } | null } | null)?.family?.name ?? '—'

  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Panel de administración</h1>
        <p className="text-muted text-sm mt-1">Resumen de reservas · {currentYear}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Reservas activas"  value={String(activeReservations.length)} sub="este año" />
        <StatCard label="Noches totales"    value={String(totalNights)}               sub={`año ${currentYear}`} />
        <StatCard label="Ingresos"          value={formatPrice(totalIncome)}           sub={`año ${currentYear}`} />
        <StatCard label="Familia de agosto" value={augustFamily}                       sub={String(currentYear)} />
      </div>

      {/* Tabs por mes */}
      <div>
        <h2 className="font-display text-xl font-semibold text-navy mb-4">Reservas por mes</h2>
        <AdminTabs reservations={reservations} initialMonth={currentMonth} />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-card">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-navy mt-1">{value}</p>
      <p className="text-xs text-blue mt-0.5">{sub}</p>
    </div>
  )
}
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: página /admin con stats y tabla de reservas por mes"
```

---

## Task 7: ReservationList para admin

**Files:**
- Modify: `src/components/ReservationList.tsx`

- [ ] **Añadir props de admin y sección de crear reserva**

Reemplazar el archivo completo:

```typescript
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
            isActive ? 'bg-green-100 text-green-700' : 'bg-stone text-muted'
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
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Commit**

```bash
git add src/components/ReservationList.tsx
git commit -m "feat: ReservationList con vista admin — crear para familiar, ver todas"
```

---

## Task 8: Página /reservas diferenciada por rol

**Files:**
- Modify: `src/app/reservas/page.tsx`

- [ ] **Reescribir la página**

```typescript
// src/app/reservas/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { ReservationList } from '@/components/ReservationList'
import type { Reservation, User } from '@/types'

export const metadata: Metadata = { title: 'Reservas' }

export default async function ReservasPage() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!currentUser) redirect('/sign-in')

  const isAdmin = currentUser.role === 'admin'
  const today   = new Date().toISOString().split('T')[0]

  if (isAdmin) {
    // Admin: cargar todas las reservas y todos los usuarios
    const [
      { data: allReservationsRaw },
      { data: allUsersRaw },
    ] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at, user:users(id, first_name, last_name, family:families(name))')
        .order('check_in', { ascending: false }),
      supabase
        .from('users')
        .select('id, first_name, last_name, family_id, family:families(name)')
        .order('family_id')
        .order('first_name'),
    ])

    const allReservations = (allReservationsRaw ?? []) as unknown as Reservation[]
    const allUsers        = (allUsersRaw ?? []) as unknown as User[]

    const activeReservations = allReservations.filter(r => r.status === 'active' && r.check_out > today)
    const pastReservations   = allReservations.filter(r => r.status === 'cancelled' || r.check_out <= today)

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-navy">Reservas</h1>
          <p className="text-muted text-sm mt-1">Vista de administrador — todas las familias</p>
        </div>
        <ReservationList
          activeReservations={activeReservations}
          pastReservations={pastReservations}
          isAdmin={true}
          allUsers={allUsers}
        />
      </div>
    )
  }

  // Usuario normal: solo sus reservas
  const { data: allReservations } = await supabase
    .from('reservations')
    .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at')
    .eq('user_id', currentUser.id)
    .order('check_in', { ascending: false })

  const reservations       = (allReservations ?? []) as unknown as Reservation[]
  const activeReservations = reservations.filter(r => r.status === 'active' && r.check_out > today)
  const pastReservations   = reservations.filter(r => r.status === 'cancelled' || r.check_out <= today)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-navy">Mis reservas</h1>
        <p className="text-muted text-sm mt-1">Gestiona tus reservas en Casa Cervantes</p>
      </div>
      <ReservationList
        activeReservations={activeReservations}
        pastReservations={pastReservations}
      />
    </div>
  )
}
```

- [ ] **Verificar compilación y tests**

```bash
npx tsc --noEmit && npm run test
```

Expected: sin errores, 54 tests passing.

- [ ] **Commit**

```bash
git add src/app/reservas/page.tsx
git commit -m "feat: /reservas diferenciada por rol — admin ve todo y puede crear"
```

---

## Task 9: Enlace /admin en el Header

**Files:**
- Modify: `src/components/Header.tsx`

El Header usa `useUser()` de Clerk. Añadimos el enlace `/admin` cuando `user.publicMetadata?.role === 'admin'`.

> **Nota:** Requiere que el usuario admin tenga `publicMetadata: { role: 'admin' }` en Clerk Dashboard → Users → Adrian → Metadata.

- [ ] **Actualizar Header.tsx**

Reemplazar el contenido del archivo:

```typescript
// src/components/Header.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'

const NAV_PUBLIC = [
  { href: '/normas', label: 'Normas' },
  { href: '/fotos',  label: 'Fotos'  },
]

const NAV_PRIVATE = [
  { href: '/calendario', label: 'Calendario'   },
  { href: '/reservas',   label: 'Mis reservas' },
]

const NAV_ADMIN = [
  { href: '/admin', label: 'Admin' },
]

export function Header() {
  const pathname       = usePathname()
  const { isSignedIn, user } = useUser()
  const isAdmin = user?.publicMetadata?.role === 'admin'

  const allLinks = isSignedIn
    ? [...(isAdmin ? NAV_ADMIN : []), ...NAV_PRIVATE, ...NAV_PUBLIC]
    : NAV_PUBLIC

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-sm border-b border-border shadow-[0_1px_12px_rgba(29,53,87,0.06)]">
      <div className="max-w-7xl mx-auto px-8 md:px-12 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="font-display text-xl font-bold text-navy tracking-wide hover:opacity-75 transition-opacity"
        >
          Casa Cervantes
        </Link>

        {/* Navegación */}
        <nav className="hidden md:flex items-center gap-7">
          {allLinks.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors duration-150 ${
                  isActive
                    ? 'text-navy font-medium border-b-2 border-gold pb-0.5'
                    : 'text-muted hover:text-navy'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Auth */}
        <div className="flex items-center">
          {isSignedIn ? (
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'w-9 h-9' } }}
            />
          ) : (
            <SignInButton mode="redirect">
              <button className="bg-navy text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-navy-dark transition-colors duration-150 tracking-wide">
                Entrar
              </button>
            </SignInButton>
          )}
        </div>

      </div>
    </header>
  )
}
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Ir a Clerk Dashboard → Users → Adrian → Metadata → publicMetadata**

Añadir:
```json
{ "role": "admin" }
```

- [ ] **Verificar en el navegador**

1. Iniciar sesión como Adrian → el enlace "Admin" debe aparecer en el nav
2. Navegar a `/admin` → debe cargar el dashboard
3. Navegar a `/reservas` → debe mostrar todas las reservas y sección de crear
4. Navegar a `/calendario` → panel lateral visible a la derecha
5. Seleccionar un rango → panel muestra resumen y botón confirmar

- [ ] **Commit final**

```bash
git add src/components/Header.tsx
git commit -m "feat: enlace /admin en header para usuarios con role=admin"
```

---

## Task 10: Eliminar ReservationConfirmModal

**Files:**
- Delete: `src/components/ReservationConfirmModal.tsx`

- [ ] **Verificar que no hay ninguna importación activa**

```bash
grep -r "ReservationConfirmModal" src/
```

Expected: sin resultados (el único uso era en `DoubleCalendar.tsx`, ya reemplazado).

- [ ] **Eliminar el archivo**

```bash
git rm src/components/ReservationConfirmModal.tsx
```

- [ ] **Verificar compilación y tests finales**

```bash
npx tsc --noEmit && npm run test
```

Expected: sin errores, 54 tests passing.

- [ ] **Commit**

```bash
git commit -m "chore: eliminar ReservationConfirmModal, sustituido por ReservationPanel"
```
