# Restricción días disfrutados año anterior — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir que un usuario reserve días exactos que ya disfrutó (reserva activa) el año anterior; mostrar esos días en el calendario con rayas rojas suaves.

**Architecture:** Validación SQL en el RPC (capa de seguridad), nuevo estado `'prev-year-blocked'` en `getDayInfo` (capa visual), prop `userPrevYearReservations` que fluye de `page.tsx` → `DoubleCalendar` → `MonthGrid` → `WeekRow` → `getDayInfo`. Admin exento.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL RPC), Tailwind CSS, Vitest.

---

## File Map

| Fichero | Acción | Propósito |
|---|---|---|
| `supabase/migrations/008_prev_year_blocked.sql` | Crear | Check SQL en RPC |
| `src/lib/calendar.ts` | Modificar | Nuevo DayState + lógica getDayInfo |
| `src/test/lib/calendar.test.ts` | Modificar | Tests TDD actualizados |
| `src/components/DoubleCalendar.tsx` | Modificar | Cadena de props + estilos |
| `src/app/calendario/page.tsx` | Modificar | Query año anterior + pasar prop |

---

## Task 1: SQL — Migración 008

**Files:**
- Create: `supabase/migrations/008_prev_year_blocked.sql`

- [ ] **Step 1: Crear la migración**

Crear `supabase/migrations/008_prev_year_blocked.sql` con el contenido completo del RPC, incluyendo el nuevo check. Este es el RPC completo actualizado (incluye todos los checks anteriores de 007 más el nuevo):

```sql
-- ============================================================
-- MIGRACIÓN 008: Añadir restricción de días ya disfrutados
--                el año anterior por el mismo usuario
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE OR REPLACE FUNCTION create_reservation(
  p_user_id         UUID,
  p_check_in        DATE,
  p_check_out       DATE,
  p_caller_is_admin BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id   UUID;
  v_user_family_id   UUID;
  v_august_family_id UUID;
  v_current_year     INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_nights           INTEGER := p_check_out - p_check_in;
BEGIN
  -- 1. Fecha de entrada no en el pasado
  IF p_check_in < CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de entrada no puede ser en el pasado';
  END IF;

  -- 2. Año natural
  IF EXTRACT(YEAR FROM p_check_in)::INTEGER != v_current_year
     OR EXTRACT(YEAR FROM p_check_out)::INTEGER != v_current_year THEN
    IF NOT (p_check_out = make_date(v_current_year + 1, 1, 1)
            AND EXTRACT(YEAR FROM p_check_in)::INTEGER = v_current_year) THEN
      RAISE EXCEPTION 'Solo se puede reservar dentro del año natural actual';
    END IF;
  END IF;

  -- 3. Antelación máxima 4 meses
  IF p_check_in > CURRENT_DATE + INTERVAL '4 months' THEN
    RAISE EXCEPTION 'No se puede reservar con más de 4 meses de antelación';
  END IF;

  -- 4. Máximo 15 noches consecutivas
  IF v_nights > 15 THEN
    RAISE EXCEPTION 'Máximo 15 noches consecutivas';
  END IF;

  -- 5. Sin solapamiento con reservas activas
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE status    = 'active'
      AND check_in  < p_check_out
      AND check_out > p_check_in
  ) THEN
    RAISE EXCEPTION 'Las fechas seleccionadas ya están reservadas';
  END IF;

  -- 6. Máximo 1 reserva activa en curso por usuario no-admin
  IF NOT p_caller_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM reservations
      WHERE user_id  = p_user_id
        AND status   = 'active'
        AND check_out > CURRENT_DATE
    ) THEN
      RAISE EXCEPTION 'No puedes realizar otra reserva debido a que tienes una reserva activa.';
    END IF;
  END IF;

  -- 7. Mismos días disfrutados el año anterior (solo no-admin)
  IF NOT p_caller_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM reservations
      WHERE user_id  = p_user_id
        AND status   = 'active'
        AND check_in  < (p_check_out - INTERVAL '1 year')
        AND check_out > (p_check_in  - INTERVAL '1 year')
    ) THEN
      RAISE EXCEPTION 'No puedes reservar fechas que ya disfrutaste el año anterior';
    END IF;
  END IF;

  -- 8. Familia del usuario
  SELECT family_id INTO v_user_family_id FROM users WHERE id = p_user_id;

  IF v_user_family_id IS NULL THEN
    RAISE EXCEPTION 'Tu usuario no tiene una familia asignada. Contacta con el administrador.';
  END IF;

  -- 9. Restricción agosto
  IF EXTRACT(MONTH FROM p_check_in) = 8
     OR (p_check_out > make_date(v_current_year, 8, 1)
         AND p_check_in < make_date(v_current_year, 9, 1)) THEN

    SELECT family_id INTO v_august_family_id
    FROM august_assignments
    WHERE year = v_current_year;

    IF v_august_family_id IS NULL THEN
      RAISE EXCEPTION 'No se ha asignado familia para agosto de este año. Contacta con el administrador.';
    END IF;

    IF v_user_family_id != v_august_family_id THEN
      RAISE EXCEPTION 'Solo la familia asignada puede reservar en agosto';
    END IF;
  END IF;

  -- 10. Insertar reserva
  INSERT INTO reservations (user_id, check_in, check_out)
  VALUES (p_user_id, p_check_in, p_check_out)
  RETURNING id INTO v_reservation_id;

  -- 11. Audit log
  INSERT INTO audit_log (user_id, action, reservation_id, details)
  VALUES (
    p_user_id,
    'reservation_created',
    v_reservation_id,
    jsonb_build_object(
      'check_in',    p_check_in,
      'check_out',   p_check_out,
      'nights',      v_nights,
      'total_price', v_nights * 30
    )
  );

  RETURN v_reservation_id;
END;
$$;
```

- [ ] **Step 2: Ejecutar en Supabase**

Abrir Supabase Dashboard → SQL Editor → pegar el contenido → Run.

Verificar con:
```sql
SELECT proname FROM pg_proc WHERE proname = 'create_reservation';
```
Expected: 1 fila.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_prev_year_blocked.sql
git commit -m "feat: migración SQL — restricción días disfrutados año anterior"
```

---

## Task 2: TDD — calendar.ts

**Files:**
- Modify: `src/test/lib/calendar.test.ts`
- Modify: `src/lib/calendar.ts`

- [ ] **Step 1: Actualizar tests (deben fallar con el código actual)**

Reemplazar `src/test/lib/calendar.test.ts` con:

```ts
// src/test/lib/calendar.test.ts
import { describe, it, expect } from 'vitest'
import { getDayInfo, isDaySelectable, hasReservationConflict } from '@/lib/calendar'
import type { Reservation, User } from '@/types'

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
    const info = getDayInfo('2020-01-01', 1, noReservations, user, null, [], null, null)
    expect(info.state).toBe('past')
    expect(info.hasGoldDot).toBe(false)
  })

  it('días reservados son state=reserved con nombre del reservador', () => {
    const reservation = makeReservation('2030-06-10', '2030-06-15')
    const info = getDayInfo('2030-06-12', 12, [reservation], user, null, [], null, null)
    expect(info.state).toBe('reserved')
    expect(info.reserverName).toBe('Otro Usuario')
  })

  it('primer día de la reserva es reserved, el checkout no', () => {
    const reservation = makeReservation('2030-06-10', '2030-06-13')
    const inFirst = getDayInfo('2030-06-10', 10, [reservation], user, null, [], null, null)
    const atCheckout = getDayInfo('2030-06-13', 13, [reservation], user, null, [], null, null)
    expect(inFirst.state).toBe('reserved')
    expect(atCheckout.state).toBe('available')
  })

  it('agosto bloqueado cuando familia no coincide', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, 'family-b', [], null, null)
    expect(info.state).toBe('august-blocked')
  })

  it('agosto NO bloqueado cuando familia coincide', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, 'family-a', [], null, null)
    expect(info.state).not.toBe('august-blocked')
  })

  it('agosto NO bloqueado cuando augustFamilyId es null', () => {
    const info = getDayInfo('2030-08-15', 15, noReservations, user, null, [], null, null)
    expect(info.state).not.toBe('august-blocked')
  })

  it('día disfrutado el año anterior es prev-year-blocked', () => {
    const prevRes = makeReservation('2026-01-01', '2026-01-05')
    const info = getDayInfo('2027-01-03', 3, [], user, null, [prevRes], null, null)
    expect(info.state).toBe('prev-year-blocked')
  })

  it('día checkout del año anterior NO está bloqueado', () => {
    const prevRes = makeReservation('2026-01-01', '2026-01-05')
    const info = getDayInfo('2027-01-05', 5, [], user, null, [prevRes], null, null)
    expect(info.state).toBe('available')
  })

  it('reserva cancelada del año anterior no bloquea', () => {
    const prevRes = { ...makeReservation('2026-01-01', '2026-01-05'), status: 'cancelled' as const }
    const info = getDayInfo('2027-01-03', 3, [], user, null, [prevRes], null, null)
    expect(info.state).toBe('available')
  })

  it('día de inicio seleccionado es selected-start', () => {
    const info = getDayInfo('2030-07-01', 1, noReservations, user, null, [], '2030-07-01', '2030-07-05')
    expect(info.state).toBe('selected-start')
  })

  it('día de fin seleccionado es selected-end', () => {
    const info = getDayInfo('2030-07-05', 5, noReservations, user, null, [], '2030-07-01', '2030-07-05')
    expect(info.state).toBe('selected-end')
  })

  it('días intermedios en el rango son in-range', () => {
    const info = getDayInfo('2030-07-03', 3, noReservations, user, null, [], '2030-07-01', '2030-07-05')
    expect(info.state).toBe('in-range')
  })

  it('día fuera del rango seleccionado es available', () => {
    const info = getDayInfo('2030-07-07', 7, noReservations, user, null, [], '2030-07-01', '2030-07-05')
    expect(info.state).toBe('available')
  })

  it('reserva cancelada no bloquea el día', () => {
    const cancelled: Reservation = { ...makeReservation('2030-07-01', '2030-07-05'), status: 'cancelled' }
    const info = getDayInfo('2030-07-03', 3, [cancelled], user, null, [], null, null)
    expect(info.state).toBe('available')
  })

  it('pasado tiene prioridad sobre reservado', () => {
    const reservation = makeReservation('2020-01-01', '2020-01-05')
    const info = getDayInfo('2020-01-03', 3, [reservation], user, null, [], null, null)
    expect(info.state).toBe('past')
  })

  it('en selección parcial (solo start), días no seleccionados siguen siendo available', () => {
    const info = getDayInfo('2030-07-10', 10, noReservations, user, null, [], '2030-07-01', null)
    expect(info.state).toBe('available')
  })
})

describe('isDaySelectable', () => {
  it('available es seleccionable', () => expect(isDaySelectable('available')).toBe(true))
  it('today es seleccionable', () => expect(isDaySelectable('today')).toBe(true))
  it('past no es seleccionable', () => expect(isDaySelectable('past')).toBe(false))
  it('reserved no es seleccionable', () => expect(isDaySelectable('reserved')).toBe(false))
  it('august-blocked no es seleccionable', () => expect(isDaySelectable('august-blocked')).toBe(false))
  it('prev-year-blocked no es seleccionable', () => expect(isDaySelectable('prev-year-blocked')).toBe(false))
  it('selected-start es seleccionable', () => expect(isDaySelectable('selected-start')).toBe(true))
  it('selected-end no es seleccionable', () => expect(isDaySelectable('selected-end')).toBe(false))
  it('in-range es seleccionable', () => expect(isDaySelectable('in-range')).toBe(true))
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

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

```bash
npm run test:run -- src/test/lib/calendar.test.ts
```
Expected: FAIL — los tests nuevos de `prev-year-blocked` y los existentes que llaman a `getDayInfo` con aridad incorrecta.

- [ ] **Step 3: Actualizar `src/lib/calendar.ts`**

Reemplazar el fichero completo con:

```ts
// src/lib/calendar.ts
import { isDateInRange, todayISO } from '@/lib/utils'
import type { Reservation, User } from '@/types'

export type DayState =
  | 'past'
  | 'reserved'
  | 'august-blocked'
  | 'prev-year-blocked'
  | 'selected-start'
  | 'selected-end'
  | 'in-range'
  | 'today'
  | 'available'

export interface DayInfo {
  date: string        // 'YYYY-MM-DD'
  dayOfMonth: number
  state: DayState
  hasGoldDot: boolean
  reserverName?: string
  reservationId?: string
}

export function getDayInfo(
  date: string,
  dayOfMonth: number,
  reservations: Reservation[],
  currentUser: User,
  augustFamilyId: string | null,
  userPrevYearReservations: Reservation[],
  selectedStart: string | null,
  selectedEnd: string | null,
): DayInfo {
  const today = todayISO()
  const hasGoldDot = date === today

  // 1. Pasado (excluyendo hoy)
  if (date < today) {
    return { date, dayOfMonth, state: 'past', hasGoldDot: false }
  }

  // 2. Reservado
  const coveringReservation = reservations.find(r =>
    r.status === 'active' && isDateInRange(date, r.check_in, r.check_out)
  )
  if (coveringReservation) {
    const u = coveringReservation.user
    const reserverName = u ? `${u.first_name} ${u.last_name}` : 'Reservado'
    return { date, dayOfMonth, state: 'reserved', hasGoldDot, reserverName, reservationId: coveringReservation.id }
  }

  // 3. Agosto bloqueado
  const isAugust = date.substring(5, 7) === '08'
  if (isAugust && augustFamilyId !== null && currentUser.family_id !== augustFamilyId) {
    return { date, dayOfMonth, state: 'august-blocked', hasGoldDot }
  }

  // 4. Días disfrutados el año anterior
  const prevYearDate = `${parseInt(date.slice(0, 4)) - 1}${date.slice(4)}`
  const blockedByPrevYear = userPrevYearReservations.some(r =>
    r.status === 'active' &&
    prevYearDate >= r.check_in &&
    prevYearDate < r.check_out
  )
  if (blockedByPrevYear) {
    return { date, dayOfMonth, state: 'prev-year-blocked', hasGoldDot }
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

export function isDaySelectable(state: DayState): boolean {
  return state === 'available' || state === 'today' || state === 'selected-start' || state === 'in-range'
}

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

- [ ] **Step 4: Ejecutar tests para verificar que pasan**

```bash
npm run test:run -- src/test/lib/calendar.test.ts
```
Expected: todos los tests pasan (61 tests en total: 58 anteriores + 3 nuevos de prev-year-blocked + 1 nuevo de isDaySelectable).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar.ts src/test/lib/calendar.test.ts
git commit -m "feat: DayState prev-year-blocked con TDD"
```

---

## Task 3: DoubleCalendar.tsx — cadena de props y estilos

**Files:**
- Modify: `src/components/DoubleCalendar.tsx`

- [ ] **Step 1: Añadir `userPrevYearReservations` a `DoubleCalendarProps` y destructuring**

```tsx
// ANTES:
interface DoubleCalendarProps {
  reservations:          Reservation[]
  currentUser:           User
  augustFamilyId:        string | null
  forUser?:              User
  hasActiveReservation?: boolean
}

export function DoubleCalendar({
  reservations,
  currentUser,
  augustFamilyId,
  forUser,
  hasActiveReservation = false,
}: DoubleCalendarProps) {

// DESPUÉS:
interface DoubleCalendarProps {
  reservations:             Reservation[]
  currentUser:              User
  augustFamilyId:           string | null
  userPrevYearReservations: Reservation[]
  forUser?:                 User
  hasActiveReservation?:    boolean
}

export function DoubleCalendar({
  reservations,
  currentUser,
  augustFamilyId,
  userPrevYearReservations,
  forUser,
  hasActiveReservation = false,
}: DoubleCalendarProps) {
```

- [ ] **Step 2: Pasar `userPrevYearReservations` a los dos `<MonthGrid>`**

Hay dos instancias de `<MonthGrid>` (mes izquierdo y mes derecho). En ambas, añadir la prop después de `augustFamilyId`:

```tsx
// ANTES (ambas instancias):
<MonthGrid
  year={leftYear}          // (o rightYear)
  month={leftMonth}        // (o rightMonth)
  reservations={reservations}
  currentUser={calendarUser}
  augustFamilyId={augustFamilyId}
  selectedStart={selectedStart}
  selectedEnd={selectedEnd}
  onDayClick={handleDayClick}
/>

// DESPUÉS (ambas instancias):
<MonthGrid
  year={leftYear}          // (o rightYear)
  month={leftMonth}        // (o rightMonth)
  reservations={reservations}
  currentUser={calendarUser}
  augustFamilyId={augustFamilyId}
  userPrevYearReservations={userPrevYearReservations}
  selectedStart={selectedStart}
  selectedEnd={selectedEnd}
  onDayClick={handleDayClick}
/>
```

- [ ] **Step 3: Actualizar `MonthGridProps` y firma de `MonthGrid`**

```tsx
// ANTES:
interface MonthGridProps {
  year: number
  month: number
  reservations: Reservation[]
  currentUser: User
  augustFamilyId: string | null
  selectedStart: string | null
  selectedEnd: string | null
  onDayClick: (date: string, info: DayInfo) => void
}

function MonthGrid({
  year, month, reservations, currentUser, augustFamilyId,
  selectedStart, selectedEnd, onDayClick,
}: MonthGridProps) {

// DESPUÉS:
interface MonthGridProps {
  year: number
  month: number
  reservations: Reservation[]
  currentUser: User
  augustFamilyId: string | null
  userPrevYearReservations: Reservation[]
  selectedStart: string | null
  selectedEnd: string | null
  onDayClick: (date: string, info: DayInfo) => void
}

function MonthGrid({
  year, month, reservations, currentUser, augustFamilyId,
  userPrevYearReservations, selectedStart, selectedEnd, onDayClick,
}: MonthGridProps) {
```

- [ ] **Step 4: Pasar `userPrevYearReservations` a los `<WeekRow>` dentro de `MonthGrid`**

En `MonthGrid`, hay una sola instancia de `<WeekRow>` dentro del `.map`. Añadir la prop:

```tsx
// ANTES:
<WeekRow
  key={wi}
  slots={week}
  reservations={reservations}
  currentUser={currentUser}
  augustFamilyId={augustFamilyId}
  selectedStart={selectedStart}
  selectedEnd={selectedEnd}
  onDayClick={onDayClick}
/>

// DESPUÉS:
<WeekRow
  key={wi}
  slots={week}
  reservations={reservations}
  currentUser={currentUser}
  augustFamilyId={augustFamilyId}
  userPrevYearReservations={userPrevYearReservations}
  selectedStart={selectedStart}
  selectedEnd={selectedEnd}
  onDayClick={onDayClick}
/>
```

- [ ] **Step 5: Actualizar `WeekRowProps` y firma de `WeekRow`**

```tsx
// ANTES:
interface WeekRowProps {
  slots: Slot[]
  reservations: Reservation[]
  currentUser: User
  augustFamilyId: string | null
  selectedStart: string | null
  selectedEnd: string | null
  onDayClick: (date: string, info: DayInfo) => void
}

function WeekRow({
  slots, reservations, currentUser, augustFamilyId,
  selectedStart, selectedEnd, onDayClick,
}: WeekRowProps) {

// DESPUÉS:
interface WeekRowProps {
  slots: Slot[]
  reservations: Reservation[]
  currentUser: User
  augustFamilyId: string | null
  userPrevYearReservations: Reservation[]
  selectedStart: string | null
  selectedEnd: string | null
  onDayClick: (date: string, info: DayInfo) => void
}

function WeekRow({
  slots, reservations, currentUser, augustFamilyId,
  userPrevYearReservations, selectedStart, selectedEnd, onDayClick,
}: WeekRowProps) {
```

- [ ] **Step 6: Actualizar las dos llamadas a `getDayInfo` en `WeekRow`**

En `WeekRow` hay dos llamadas a `getDayInfo` (la del slot principal y la del slot `next` para calcular spans). Ambas pasan actualmente 7 argumentos; añadir `userPrevYearReservations` como 6º argumento:

```tsx
// ANTES (llamada 1 — slot principal):
const info = getDayInfo(slot.date, slot.dayOfMonth, reservations, currentUser, augustFamilyId, selectedStart, selectedEnd)

// DESPUÉS:
const info = getDayInfo(slot.date, slot.dayOfMonth, reservations, currentUser, augustFamilyId, userPrevYearReservations, selectedStart, selectedEnd)

// ANTES (llamada 2 — slot next, dentro del while de span):
const nextInfo = getDayInfo(next.date, next.dayOfMonth, reservations, currentUser, augustFamilyId, selectedStart, selectedEnd)

// DESPUÉS:
const nextInfo = getDayInfo(next.date, next.dayOfMonth, reservations, currentUser, augustFamilyId, userPrevYearReservations, selectedStart, selectedEnd)
```

- [ ] **Step 7: Actualizar `DayCell` — `stateClasses` y `stripedStyle`**

En `DayCell`, el objeto `stateClasses` necesita la entrada nueva y `stripedStyle` el nuevo branch:

```tsx
// ANTES — stateClasses (fragmento):
  const stateClasses: Record<typeof state, string> = {
    'past':           'text-muted/40 cursor-not-allowed',
    'reserved':       'bg-blue/15 text-blue cursor-not-allowed',
    'august-blocked': 'cursor-not-allowed text-muted/60',
    'selected-start': 'bg-navy text-white font-semibold cursor-pointer',
    ...
  }

// DESPUÉS — añadir entrada prev-year-blocked:
  const stateClasses: Record<typeof state, string> = {
    'past':              'text-muted/40 cursor-not-allowed',
    'reserved':          'bg-blue/15 text-blue cursor-not-allowed',
    'august-blocked':    'cursor-not-allowed text-muted/60',
    'prev-year-blocked': 'cursor-not-allowed text-muted/60',
    'selected-start':    'bg-navy text-white font-semibold cursor-pointer',
    'selected-end':      'bg-navy text-white font-semibold cursor-pointer',
    'in-range':          'bg-gold/25 text-navy cursor-pointer',
    'today':             'text-navy font-medium cursor-pointer hover:bg-blue/10',
    'available':         'text-navy cursor-pointer hover:bg-blue/10',
  }

// ANTES — stripedStyle:
  const stripedStyle =
    state === 'august-blocked'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(106,122,136,0.15) 4px, rgba(106,122,136,0.15) 8px)' }
      : undefined

// DESPUÉS:
  const stripedStyle =
    state === 'august-blocked'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(106,122,136,0.15) 4px, rgba(106,122,136,0.15) 8px)' }
      : state === 'prev-year-blocked'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(220,38,38,0.10) 4px, rgba(220,38,38,0.10) 8px)' }
      : undefined
```

- [ ] **Step 8: Actualizar `Legend` y `LegendItem`**

```tsx
// ANTES — Legend:
function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-muted mt-2">
      <LegendItem color="bg-blue/15" label="Reservado" />
      <LegendItem color="bg-navy" label="Seleccionado" textWhite />
      <LegendItem color="bg-gold/25" label="En rango" />
      <LegendItem striped="august" label="Agosto bloqueado" />
    </div>
  )
}

// DESPUÉS:
function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-muted mt-2">
      <LegendItem color="bg-blue/15" label="Reservado" />
      <LegendItem color="bg-navy" label="Seleccionado" textWhite />
      <LegendItem color="bg-gold/25" label="En rango" />
      <LegendItem striped="august" label="Agosto bloqueado" />
      <LegendItem striped="prev-year" label="Ya disfrutado" />
    </div>
  )
}

// ANTES — LegendItem tipo y stripedStyle:
function LegendItem({
  color, label, textWhite, striped,
}: {
  color?: string
  label: string
  textWhite?: boolean
  striped?: 'august'
}) {
  const stripedStyle =
    striped === 'august'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(106,122,136,0.3) 4px, rgba(106,122,136,0.3) 8px)', width: 16, height: 16 }
      : undefined

// DESPUÉS:
function LegendItem({
  color, label, textWhite, striped,
}: {
  color?: string
  label: string
  textWhite?: boolean
  striped?: 'august' | 'prev-year'
}) {
  const stripedStyle =
    striped === 'august'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(106,122,136,0.3) 4px, rgba(106,122,136,0.3) 8px)', width: 16, height: 16 }
      : striped === 'prev-year'
      ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(220,38,38,0.15) 4px, rgba(220,38,38,0.15) 8px)', width: 16, height: 16 }
      : undefined
```

- [ ] **Step 9: Verificar compilación**

```bash
npm run build 2>&1 | tail -5
```
Expected: sin errores de tipo.

- [ ] **Step 10: Commit**

```bash
git add src/components/DoubleCalendar.tsx
git commit -m "feat: cadena de props userPrevYearReservations y estilos prev-year-blocked"
```

---

## Task 4: calendario/page.tsx — query año anterior

**Files:**
- Modify: `src/app/calendario/page.tsx`

- [ ] **Step 1: Añadir query y pasar prop**

Reemplazar `src/app/calendario/page.tsx` con:

```tsx
// src/app/calendario/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { getSupabaseUser } from '@/lib/getUser'
import { DoubleCalendar } from '@/components/DoubleCalendar'
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

  const currentUser = await getSupabaseUser(clerkUserId)
  if (!currentUser) redirect('/sign-in')

  const user = currentUser as User & { family: { id: string; name: string; created_at: string } | null }

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

  const effectiveUser = forUser ?? user
  const currentYear = new Date().getFullYear()
  const prevYear = currentYear - 1

  const [
    { data: reservationsRaw },
    { data: augustAssignment },
    { data: prevYearRaw },
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at, user:users(id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at)')
      .eq('status', 'active')
      .order('check_in'),
    supabase
      .from('august_assignments')
      .select('family_id, family:families(name)')
      .eq('year', currentYear)
      .maybeSingle(),
    supabase
      .from('reservations')
      .select('id, user_id, check_in, check_out, status')
      .eq('user_id', effectiveUser.id)
      .eq('status', 'active')
      .gte('check_in', `${prevYear}-01-01`)
      .lt('check_in', `${currentYear}-01-01`),
  ])

  const reservations = (reservationsRaw ?? []) as unknown as Reservation[]
  const userPrevYearReservations = (prevYearRaw ?? []) as unknown as Reservation[]

  const today = new Date().toISOString().split('T')[0]
  const hasActiveReservation =
    user.role !== 'admin' &&
    reservations.some(r => r.user_id === effectiveUser.id && r.check_out > today)

  const augustFamilyName = (augustAssignment as unknown as { family?: { name: string } | null } | null)?.family?.name ?? null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Calendario</h1>
        <p className="text-muted text-sm mt-1">
          Selecciona las fechas de entrada y salida para hacer una reserva
        </p>
      </div>

      {!effectiveUser.family_id && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          Tu cuenta todavía no tiene una familia asignada. Contacta con el administrador para poder hacer reservas.
        </div>
      )}

      {/* Familia de agosto */}
      <div className="bg-white border border-border rounded-xl px-4 py-3 shadow-card flex items-center gap-3">
        <span className="text-lg">☀️</span>
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Agosto {currentYear}</p>
          {augustFamilyName ? (
            <p className="text-sm text-navy font-medium">
              Este año le corresponde a la <span className="font-semibold">{augustFamilyName}</span>
            </p>
          ) : (
            <p className="text-sm text-muted">Sin asignar — el administrador debe configurarlo</p>
          )}
        </div>
      </div>

      <DoubleCalendar
        reservations={reservations}
        currentUser={user}
        augustFamilyId={augustAssignment?.family_id ?? null}
        userPrevYearReservations={userPrevYearReservations}
        forUser={forUser ?? undefined}
        hasActiveReservation={hasActiveReservation}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar build y tests completos**

```bash
npm run build 2>&1 | tail -5
npm run test:run
```
Expected: build limpio, 61 tests pasan.

- [ ] **Step 3: Commit**

```bash
git add src/app/calendario/page.tsx
git commit -m "feat: query reservas año anterior y restricción visual en calendario"
```

---

## Verificación final

- [ ] `npm run build` — sin errores ni warnings de tipo
- [ ] `npm run test:run` — 61 tests pasan
- [ ] Comprobar visualmente en `npm run dev`:
  - En `/calendario`, los días que el usuario disfrutó el año anterior aparecen con rayas rojas suaves
  - La leyenda muestra "Ya disfrutado" con el patrón de rayas
  - Al intentar confirmar una reserva con días bloqueados, el RPC devuelve el mensaje de error correcto
  - El administrador puede reservar cualquier fecha sin restricción
