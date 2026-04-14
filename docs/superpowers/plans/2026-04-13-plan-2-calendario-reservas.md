# Plan 2 — Calendario y Reservas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el sistema de reservas completo: API routes que invocan los RPCs de Supabase, componente de doble calendario con todos los estados visuales, modales de confirmación/cancelación, y las páginas `/calendario` y `/reservas`.

**Architecture:** Las páginas son Server Components que obtienen datos server-side con `createAdminClient()` y los pasan a Client Components para la interactividad. Las operaciones de escritura pasan por API Routes (`/api/reservations`) que verifican la identidad via Clerk y delegan la lógica al RPC de Supabase. La lógica de estado de días del calendario vive en `src/lib/calendar.ts` (funciones puras, testeables).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v3, @clerk/nextjs v5, @supabase/supabase-js v2, Vitest

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/app/api/reservations/route.ts` | POST — crea reserva via RPC `create_reservation` |
| `src/app/api/reservations/[id]/route.ts` | PATCH — cancela reserva via RPC `cancel_reservation` |
| `src/lib/calendar.ts` | Funciones puras: estado de cada día del calendario (`DayInfo`, `getDayInfo`) |
| `src/test/lib/calendar.test.ts` | Tests de `src/lib/calendar.ts` |
| `src/components/FamilyQuotaIndicator.tsx` | Barra de progreso "Tu familia: X / 30 noches" |
| `src/components/ReservationConfirmModal.tsx` | Modal de confirmación antes de crear reserva |
| `src/components/CancelConfirmModal.tsx` | Modal de confirmación antes de cancelar |
| `src/components/DoubleCalendar.tsx` | Dos meses navegables con selección de rango y estados visuales |
| `src/components/ReservationList.tsx` | Lista de reservas con botón cancelar (Client Component) |
| `src/app/calendario/page.tsx` | Página `/calendario` — Server Component que pasa datos al calendario |
| `src/app/reservas/page.tsx` | Página `/reservas` — Server Component que pasa reservas a ReservationList |

---

## Task 1: API Route — POST /api/reservations

**Files:**
- Create: `src/app/api/reservations/route.ts`

- [ ] **Crear el archivo**

```typescript
// src/app/api/reservations/route.ts
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import type { CreateReservationRequest, CreateReservationResponse, ApiError } from '@/types'

export async function POST(req: Request): Promise<Response> {
  const { userId: clerkUserId } = auth()
  if (!clerkUserId) {
    return Response.json({ error: 'No autenticado' } satisfies ApiError, { status: 401 })
  }

  let body: CreateReservationRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' } satisfies ApiError, { status: 400 })
  }

  const { check_in, check_out } = body
  if (!check_in || !check_out) {
    return Response.json({ error: 'check_in y check_out son obligatorios' } satisfies ApiError, { status: 400 })
  }

  const supabase = createAdminClient()

  // Buscar el usuario interno por clerk_user_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (userError || !user) {
    return Response.json({ error: 'Usuario no encontrado en el sistema' } satisfies ApiError, { status: 404 })
  }

  // Llamar al RPC — el RPC hace todas las validaciones y lanza excepciones si falla
  const { data: reservationId, error: rpcError } = await supabase
    .rpc('create_reservation', {
      p_user_id:  user.id,
      p_check_in:  check_in,
      p_check_out: check_out,
    })

  if (rpcError) {
    return Response.json({ error: rpcError.message } satisfies ApiError, { status: 400 })
  }

  // Recuperar la reserva recién creada para devolver los campos calculados
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

- [ ] **Verificar manualmente** que el archivo compila sin errores:

```bash
cd "C:\Users\Adrian\OneDrive\Escritorio\Claude Code Projects\Web_Santoña" && npx tsc --noEmit
```

Esperado: sin errores relacionados con este archivo.

- [ ] **Commit**

```bash
git add src/app/api/reservations/route.ts
git commit -m "feat: POST /api/reservations — crea reserva via RPC"
```

---

## Task 2: API Route — PATCH /api/reservations/[id]

**Files:**
- Create: `src/app/api/reservations/[id]/route.ts`

- [ ] **Crear el archivo**

```typescript
// src/app/api/reservations/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import type { ApiError } from '@/types'

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { userId: clerkUserId } = auth()
  if (!clerkUserId) {
    return Response.json({ error: 'No autenticado' } satisfies ApiError, { status: 401 })
  }

  const reservationId = params.id
  const supabase = createAdminClient()

  // Buscar el usuario interno
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (userError || !user) {
    return Response.json({ error: 'Usuario no encontrado en el sistema' } satisfies ApiError, { status: 404 })
  }

  const isAdmin = user.role === 'admin'

  const { error: rpcError } = await supabase.rpc('cancel_reservation', {
    p_user_id:        user.id,
    p_reservation_id: reservationId,
    p_is_admin:       isAdmin,
  })

  if (rpcError) {
    return Response.json({ error: rpcError.message } satisfies ApiError, { status: 400 })
  }

  return Response.json({ ok: true }, { status: 200 })
}
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Commit**

```bash
git add src/app/api/reservations/[id]/route.ts
git commit -m "feat: PATCH /api/reservations/[id] — cancela reserva via RPC"
```

---

## Task 3: Funciones puras de estado del calendario

**Files:**
- Create: `src/lib/calendar.ts`
- Create: `src/test/lib/calendar.test.ts`

- [ ] **Crear `src/lib/calendar.ts`**

```typescript
// src/lib/calendar.ts
import { isDateInRange, todayISO } from '@/lib/utils'
import type { Reservation, User } from '@/types'

export type DayState =
  | 'past'           // anterior a hoy — no seleccionable, opacidad reducida
  | 'reserved'       // cubierto por reserva activa — muestra nombre, no seleccionable
  | 'august-blocked' // agosto + familia incorrecta — rayas grises, no seleccionable
  | 'quota-full'     // cuota de 30 noches agotada — rayas suaves, no seleccionable
  | 'selected-start' // inicio del rango seleccionado — fondo navy
  | 'selected-end'   // fin del rango seleccionado — fondo navy
  | 'in-range'       // dentro del rango seleccionado — fondo dorado suave
  | 'today'          // hoy — punto dorado (disponible y seleccionable)
  | 'available'      // disponible — seleccionable

export interface DayInfo {
  date: string        // 'YYYY-MM-DD'
  dayOfMonth: number
  state: DayState
  hasGoldDot: boolean // true cuando es hoy (se superpone al estado principal)
  reserverName?: string // solo cuando state === 'reserved'
}

/**
 * Calcula el estado visual y la seleccionabilidad de un día dado.
 * Función pura — no produce efectos secundarios.
 */
export function getDayInfo(
  date: string,
  dayOfMonth: number,
  reservations: Reservation[],
  currentUser: User,
  augustFamilyId: string | null,
  quotaUsed: number,
  selectedStart: string | null,
  selectedEnd: string | null,
): DayInfo {
  const today = todayISO()
  const hasGoldDot = date === today

  // 1. Pasado (excluyendo hoy)
  if (date < today) {
    return { date, dayOfMonth, state: 'past', hasGoldDot: false }
  }

  // 2. Reservado: alguna reserva activa cubre este día
  const coveringReservation = reservations.find(r =>
    r.status === 'active' && isDateInRange(date, r.check_in, r.check_out)
  )
  if (coveringReservation) {
    const u = coveringReservation.user
    const reserverName = u ? `${u.first_name} ${u.last_name}` : 'Reservado'
    return { date, dayOfMonth, state: 'reserved', hasGoldDot, reserverName }
  }

  // 3. Agosto bloqueado: mes 8 y la familia del usuario no es la asignada
  const isAugust = date.substring(5, 7) === '08'
  if (isAugust && augustFamilyId !== null && currentUser.family_id !== augustFamilyId) {
    return { date, dayOfMonth, state: 'august-blocked', hasGoldDot }
  }

  // 4. Cuota familiar agotada (solo aplica a días futuros no reservados)
  if (quotaUsed >= 30) {
    return { date, dayOfMonth, state: 'quota-full', hasGoldDot }
  }

  // 5. Selección activa
  if (date === selectedStart) {
    return { date, dayOfMonth, state: 'selected-start', hasGoldDot }
  }
  if (date === selectedEnd) {
    return { date, dayOfMonth, state: 'selected-end', hasGoldDot }
  }
  if (selectedStart && selectedEnd && date > selectedStart && date < selectedEnd) {
    return { date, dayOfMonth, state: 'in-range', hasGoldDot }
  }

  // 6. Hoy disponible
  if (hasGoldDot) {
    return { date, dayOfMonth, state: 'today', hasGoldDot: true }
  }

  return { date, dayOfMonth, state: 'available', hasGoldDot: false }
}

/**
 * Devuelve true si un día es seleccionable por el usuario.
 */
export function isDaySelectable(state: DayState): boolean {
  return state === 'available' || state === 'today' || state === 'selected-start' || state === 'in-range'
}

/**
 * Devuelve true si alguna reserva activa solapa con el rango [checkIn, checkOut).
 * Usado para validar el rango antes de abrir el modal de confirmación.
 */
export function hasReservationConflict(
  checkIn: string,
  checkOut: string,
  reservations: Reservation[],
): boolean {
  return reservations.some(r =>
    r.status === 'active' &&
    r.check_in < checkOut &&
    r.check_out > checkIn
  )
}
```

- [ ] **Escribir los tests**

```typescript
// src/test/lib/calendar.test.ts
import { describe, it, expect } from 'vitest'
import { getDayInfo, isDaySelectable, hasReservationConflict } from '@/lib/calendar'
import type { Reservation, User } from '@/types'

// Helpers para construir datos de prueba
const makeUser = (familyId: string | null = 'family-a'): User => ({
  id: 'user-1',
  clerk_user_id: 'clerk-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  family_id: familyId,
  role: 'user',
  receive_notifications: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

const makeReservation = (checkIn: string, checkOut: string, familyId = 'family-b'): Reservation => ({
  id: 'res-1',
  user_id: 'user-2',
  user: {
    id: 'user-2',
    clerk_user_id: 'clerk-2',
    email: 'other@example.com',
    first_name: 'Otro',
    last_name: 'Usuario',
    family_id: familyId,
    role: 'user',
    receive_notifications: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  check_in: checkIn,
  check_out: checkOut,
  nights: 3,
  total_price: 90,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  cancelled_at: null,
})

describe('getDayInfo', () => {
  const user = makeUser('family-a')
  const noReservations: Reservation[] = []

  it('días pasados son state=past', () => {
    const info = getDayInfo('2020-01-01', 1, noReservations, user, null, 0, null, null)
    expect(info.state).toBe('past')
    expect(info.hasGoldDot).toBe(false)
  })

  it('días reservados son state=reserved con nombre del reservador', () => {
    const reservation = makeReservation('2030-06-10', '2030-06-15')
    const info = getDayInfo('2030-06-12', 12, [reservation], user, null, 0, null, null)
    expect(info.state).toBe('reserved')
    expect(info.reserverName).toBe('Otro Usuario')
  })

  it('primer día de la reserva es reserved, el checkout no', () => {
    const reservation = makeReservation('2030-06-10', '2030-06-13')
    const inFirst = getDayInfo('2030-06-10', 10, [reservation], user, null, 0, null, null)
    const atCheckout = getDayInfo('2030-06-13', 13, [reservation], user, null, 0, null, null)
    expect(inFirst.state).toBe('reserved')
    expect(atCheckout.state).toBe('available')
  })

  it('agosto bloqueado cuando familia no coincide', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, 'family-b', 0, null, null)
    expect(info.state).toBe('august-blocked')
  })

  it('agosto NO bloqueado cuando familia coincide', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, 'family-a', 0, null, null)
    expect(info.state).not.toBe('august-blocked')
  })

  it('agosto NO bloqueado cuando augustFamilyId es null', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, null, 0, null, null)
    expect(info.state).not.toBe('august-blocked')
  })

  it('cuota agotada devuelve quota-full', () => {
    const info = getDayInfo('2030-07-01', 1, noReservations, user, null, 30, null, null)
    expect(info.state).toBe('quota-full')
  })

  it('cuota sin agotar devuelve available', () => {
    const info = getDayInfo('2030-07-01', 1, noReservations, user, null, 29, null, null)
    expect(info.state).toBe('available')
  })

  it('día de inicio seleccionado es selected-start', () => {
    const info = getDayInfo('2030-07-01', 1, noReservations, user, null, 0, '2030-07-01', '2030-07-05')
    expect(info.state).toBe('selected-start')
  })

  it('día de fin seleccionado es selected-end', () => {
    const info = getDayInfo('2030-07-05', 5, noReservations, user, null, 0, '2030-07-01', '2030-07-05')
    expect(info.state).toBe('selected-end')
  })

  it('días intermedios en el rango son in-range', () => {
    const info = getDayInfo('2030-07-03', 3, noReservations, user, null, 0, '2030-07-01', '2030-07-05')
    expect(info.state).toBe('in-range')
  })

  it('día fuera del rango seleccionado es available', () => {
    const info = getDayInfo('2030-07-07', 7, noReservations, user, null, 0, '2030-07-01', '2030-07-05')
    expect(info.state).toBe('available')
  })

  it('reserva cancelada no bloquea el día', () => {
    const cancelled: Reservation = { ...makeReservation('2030-07-01', '2030-07-05'), status: 'cancelled' }
    const info = getDayInfo('2030-07-03', 3, [cancelled], user, null, 0, null, null)
    expect(info.state).toBe('available')
  })

  it('pasado tiene prioridad sobre reservado', () => {
    const reservation = makeReservation('2020-01-01', '2020-01-05')
    const info = getDayInfo('2020-01-03', 3, [reservation], user, null, 0, null, null)
    expect(info.state).toBe('past')
  })
})

describe('isDaySelectable', () => {
  it('available es seleccionable', () => expect(isDaySelectable('available')).toBe(true))
  it('today es seleccionable', () => expect(isDaySelectable('today')).toBe(true))
  it('past no es seleccionable', () => expect(isDaySelectable('past')).toBe(false))
  it('reserved no es seleccionable', () => expect(isDaySelectable('reserved')).toBe(false))
  it('august-blocked no es seleccionable', () => expect(isDaySelectable('august-blocked')).toBe(false))
  it('quota-full no es seleccionable', () => expect(isDaySelectable('quota-full')).toBe(false))
})

describe('hasReservationConflict', () => {
  it('detecta solapamiento parcial al inicio', () => {
    const res = makeReservation('2030-07-08', '2030-07-12')
    expect(hasReservationConflict('2030-07-06', '2030-07-10', [res])).toBe(true)
  })

  it('detecta solapamiento parcial al final', () => {
    const res = makeReservation('2030-07-08', '2030-07-12')
    expect(hasReservationConflict('2030-07-10', '2030-07-15', [res])).toBe(true)
  })

  it('detecta reserva completamente dentro del rango', () => {
    const res = makeReservation('2030-07-09', '2030-07-11')
    expect(hasReservationConflict('2030-07-08', '2030-07-12', [res])).toBe(true)
  })

  it('no hay conflicto cuando el rango es adyacente', () => {
    const res = makeReservation('2030-07-08', '2030-07-12')
    expect(hasReservationConflict('2030-07-12', '2030-07-15', [res])).toBe(false)
    expect(hasReservationConflict('2030-07-05', '2030-07-08', [res])).toBe(false)
  })

  it('reservas canceladas no producen conflicto', () => {
    const res: Reservation = { ...makeReservation('2030-07-08', '2030-07-12'), status: 'cancelled' }
    expect(hasReservationConflict('2030-07-08', '2030-07-12', [res])).toBe(false)
  })

  it('sin reservas no hay conflicto', () => {
    expect(hasReservationConflict('2030-07-08', '2030-07-12', [])).toBe(false)
  })
})
```

- [ ] **Ejecutar los tests**

```bash
cd "C:\Users\Adrian\OneDrive\Escritorio\Claude Code Projects\Web_Santoña" && npx vitest run src/test/lib/calendar.test.ts
```

Esperado: todos los tests en verde (PASS).

- [ ] **Commit**

```bash
git add src/lib/calendar.ts src/test/lib/calendar.test.ts
git commit -m "feat: funciones puras de estado del calendario + tests"
```

---

## Task 4: FamilyQuotaIndicator

**Files:**
- Create: `src/components/FamilyQuotaIndicator.tsx`

- [ ] **Crear el componente**

```tsx
// src/components/FamilyQuotaIndicator.tsx
const MAX_NIGHTS = 30

interface FamilyQuotaIndicatorProps {
  familyName: string
  usedNights: number
}

export function FamilyQuotaIndicator({ familyName, usedNights }: FamilyQuotaIndicatorProps) {
  const pct = Math.min((usedNights / MAX_NIGHTS) * 100, 100)
  const remaining = MAX_NIGHTS - usedNights

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-card">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium text-navy">{familyName}</span>
        <span className="text-sm text-muted">
          <span className="font-semibold text-navy">{usedNights}</span> / {MAX_NIGHTS} noches
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            usedNights >= MAX_NIGHTS ? 'bg-red-400' : 'bg-gold'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {usedNights < MAX_NIGHTS ? (
        <p className="text-xs text-muted mt-1.5">
          Te quedan <span className="font-medium text-navy">{remaining} noches</span> disponibles en los próximos 4 meses
        </p>
      ) : (
        <p className="text-xs text-red-500 mt-1.5 font-medium">
          Cuota agotada — no puedes hacer nuevas reservas este período
        </p>
      )}
    </div>
  )
}
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/FamilyQuotaIndicator.tsx
git commit -m "feat: componente FamilyQuotaIndicator"
```

---

## Task 5: ReservationConfirmModal

**Files:**
- Create: `src/components/ReservationConfirmModal.tsx`

- [ ] **Crear el componente**

```tsx
// src/components/ReservationConfirmModal.tsx
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
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/ReservationConfirmModal.tsx
git commit -m "feat: componente ReservationConfirmModal"
```

---

## Task 6: CancelConfirmModal

**Files:**
- Create: `src/components/CancelConfirmModal.tsx`

- [ ] **Crear el componente**

```tsx
// src/components/CancelConfirmModal.tsx
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
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/CancelConfirmModal.tsx
git commit -m "feat: componente CancelConfirmModal"
```

---

## Task 7: DoubleCalendar

**Files:**
- Create: `src/components/DoubleCalendar.tsx`

- [ ] **Crear el componente**

```tsx
// src/components/DoubleCalendar.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getDayInfo, isDaySelectable, hasReservationConflict, type DayInfo } from '@/lib/calendar'
import { getDaysInMonth, getMonthStartDayOffset, monthName, calcNights } from '@/lib/utils'
import { ReservationConfirmModal } from '@/components/ReservationConfirmModal'
import type { Reservation, User } from '@/types'

interface DoubleCalendarProps {
  reservations: Reservation[]
  currentUser: User
  augustFamilyId: string | null
  quotaUsed: number
}

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function DoubleCalendar({
  reservations,
  currentUser,
  augustFamilyId,
  quotaUsed,
}: DoubleCalendarProps) {
  const router = useRouter()
  const now = new Date()

  // El mes izquierdo es el mes actual
  const [baseYear, setBaseYear]   = useState(now.getFullYear())
  const [baseMonth, setBaseMonth] = useState(now.getMonth() + 1) // 1-indexed

  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd,   setSelectedEnd]   = useState<string | null>(null)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [isLoading,     setIsLoading]     = useState(false)
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null)

  // Calcular los dos meses a mostrar
  const leftYear  = baseYear
  const leftMonth = baseMonth
  const rightYear  = leftMonth === 12 ? leftYear + 1 : leftYear
  const rightMonth = leftMonth === 12 ? 1 : leftMonth + 1

  // Navegación: solo permitir ir atrás si el mes izquierdo no es el actual
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
      // Empezar nueva selección
      setSelectedStart(date)
      setSelectedEnd(null)
      return
    }

    // Segundo click
    if (date <= selectedStart) {
      // El usuario hizo click en un día igual o anterior — reiniciar
      setSelectedStart(date)
      setSelectedEnd(null)
      return
    }

    // Validar que no haya reservas dentro del rango
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
          Entrada: <strong>{selectedStart}</strong> — ahora selecciona el día de salida
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

  // Patrones de rayas via inline style
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
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/DoubleCalendar.tsx
git commit -m "feat: componente DoubleCalendar con selección de rango y estados visuales"
```

---

## Task 8: Página /calendario

**Files:**
- Create: `src/app/calendario/page.tsx`

- [ ] **Crear la página**

```tsx
// src/app/calendario/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { DoubleCalendar } from '@/components/DoubleCalendar'
import { FamilyQuotaIndicator } from '@/components/FamilyQuotaIndicator'
import type { Reservation, User } from '@/types'

export const metadata: Metadata = { title: 'Calendario' }

export default async function CalendarioPage() {
  const { userId: clerkUserId } = auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  // 1. Obtener el usuario actual
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at, family:families(id, name, created_at)')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!currentUser) redirect('/sign-in')

  const user = currentUser as User & { family: { id: string; name: string; created_at: string } | null }

  // 2. Todas las reservas activas con datos del usuario
  const { data: reservationsRaw } = await supabase
    .from('reservations')
    .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at, user:users(id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at)')
    .eq('status', 'active')
    .order('check_in')

  const reservations = (reservationsRaw ?? []) as Reservation[]

  // 3. Asignación de agosto del año en curso
  const currentYear = new Date().getFullYear()
  const { data: augustAssignment } = await supabase
    .from('august_assignments')
    .select('family_id')
    .eq('year', currentYear)
    .maybeSingle()

  // 4. Cuota familiar usada
  let quotaUsed = 0
  if (user.family_id) {
    const { data: quota } = await supabase
      .rpc('get_family_quota', { p_family_id: user.family_id })
    quotaUsed = quota ?? 0
  }

  const familyName = user.family?.name ?? 'Tu familia'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Calendario</h1>
        <p className="text-muted text-sm mt-1">
          Selecciona las fechas de entrada y salida para hacer una reserva
        </p>
      </div>

      {user.family_id ? (
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
      />
    </div>
  )
}
```

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Verificar en el navegador** con `npm run dev`:

Abrir `http://localhost:3000/calendario` → debe mostrar el doble calendario con la barra de cuota.

- [ ] **Commit**

```bash
git add src/app/calendario/page.tsx
git commit -m "feat: página /calendario — doble calendario con cuota familiar"
```

---

## Task 9: ReservationList y página /reservas

**Files:**
- Create: `src/components/ReservationList.tsx`
- Create: `src/app/reservas/page.tsx`

- [ ] **Crear `src/components/ReservationList.tsx`**

```tsx
// src/components/ReservationList.tsx
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
```

- [ ] **Crear `src/app/reservas/page.tsx`**

```tsx
// src/app/reservas/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { ReservationList } from '@/components/ReservationList'
import type { Reservation } from '@/types'

export const metadata: Metadata = { title: 'Mis reservas' }

export default async function ReservasPage() {
  const { userId: clerkUserId } = auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  // Obtener el usuario interno
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) redirect('/sign-in')

  // Obtener todas las reservas del usuario, más recientes primero
  const { data: allReservations } = await supabase
    .from('reservations')
    .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at')
    .eq('user_id', user.id)
    .order('check_in', { ascending: false })

  const reservations = (allReservations ?? []) as Reservation[]
  const today = new Date().toISOString().split('T')[0]

  const activeReservations = reservations.filter(r => r.status === 'active')
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

- [ ] **Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Verificar en el navegador**:
  - `http://localhost:3000/reservas` → debe mostrar la lista de reservas (vacía si no hay ninguna)

- [ ] **Commit**

```bash
git add src/components/ReservationList.tsx src/app/reservas/page.tsx
git commit -m "feat: página /reservas y componente ReservationList con cancelación"
```

---

## Task 10: Añadir navegación al Header

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Leer el Header actual**

Lee `src/components/Header.tsx` para ver la estructura de navegación existente.

- [ ] **Añadir los enlaces `/calendario` y `/reservas`** en la lista de navegación autenticada. Los enlaces solo deben aparecer cuando el usuario está logueado. El Header ya usa `useAuth()` o similar de Clerk — añade los links a la sección de navegación autenticada:

```tsx
// Dentro del bloque de navegación autenticada (donde ya existe el enlace a /normas o similar):
<Link href="/calendario" className="text-sm font-medium text-navy hover:text-gold transition-colors">
  Calendario
</Link>
<Link href="/reservas" className="text-sm font-medium text-navy hover:text-gold transition-colors">
  Mis reservas
</Link>
```

- [ ] **Verificar en el navegador** que los enlaces aparecen en el header cuando hay sesión iniciada.

- [ ] **Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: enlaces Calendario y Mis reservas en el Header"
```

---

## Verificación final

- [ ] **Ejecutar todos los tests**

```bash
npx vitest run
```

Esperado: todos en verde.

- [ ] **Verificar compilación completa**

```bash
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Prueba de flujo completo en el navegador**:
  1. Iniciar sesión
  2. Ir a `/calendario` → ver doble calendario + indicador de cuota
  3. Seleccionar un rango de fechas → aparece el modal
  4. Confirmar → la reserva aparece en el calendario
  5. Ir a `/reservas` → ver la reserva creada
  6. Cancelar la reserva → desaparece de activas, pasa a historial
