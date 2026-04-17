# Restricción: no reservar días ya disfrutados el año anterior

## Objetivo

Impedir que un usuario reserve días que ya disfrutó (reserva activa) el año anterior. El administrador queda exento. Las reservas canceladas no cuentan.

**Ejemplo:** Si el usuario reservó Jan 1–4 de 2026 (activa, no cancelada), no puede reservar Jan 1–4 de 2027.

---

## Reglas de negocio

- **Alcance:** por usuario (no por familia).
- **Sólo reservas activas** del año anterior bloquean días. Las canceladas no.
- **El admin** puede reservar cualquier fecha para cualquier usuario sin restricción.
- **Año anterior** = `EXTRACT(YEAR FROM CURRENT_DATE) - 1`. La ventana es Jan 1 – Dec 31 del año pasado.
- **Feb 29** en año no bisiesto: el string de comparación `YYYY-02-29` no coincide con ninguna reserva real → sin bloqueo. Comportamiento correcto sin código especial.

---

## Arquitectura

### 1. SQL — Migración 008

Nueva migración `supabase/migrations/008_prev_year_blocked.sql`.

Añade un bloque al RPC `create_reservation` (después del check de 1 reserva activa, antes del INSERT):

```sql
-- Mismos días disfrutados el año anterior (solo no-admin)
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
```

Lógica: desplazar el rango solicitado 1 año atrás y comprobar solapamiento con reservas activas del usuario. Si reservó Jan 1–4 de 2026 (check_out = Jan 5), al pedir Jan 1–4 de 2027 el rango desplazado es Jan 1–4 de 2026 → solapamiento → excepción.

### 2. `src/lib/calendar.ts`

**`DayState`** — añadir `'prev-year-blocked'`.

**`getDayInfo`** — nuevo parámetro `userPrevYearReservations: Reservation[]` (posición 6, entre `augustFamilyId` y `selectedStart`). Check insertado después de `august-blocked`:

```ts
const prevYearDate = `${parseInt(date.slice(0, 4)) - 1}${date.slice(4)}`
const blockedByPrevYear = userPrevYearReservations.some(r =>
  r.status === 'active' &&
  prevYearDate >= r.check_in &&
  prevYearDate < r.check_out
)
if (blockedByPrevYear) {
  return { date, dayOfMonth, state: 'prev-year-blocked', hasGoldDot }
}
```

**`isDaySelectable`** — `'prev-year-blocked'` devuelve `false`.

### 3. `src/app/calendario/page.tsx`

Añadir tercera query en `Promise.all`:

```ts
supabase
  .from('reservations')
  .select('id, user_id, check_in, check_out, status')
  .eq('user_id', effectiveUser.id)
  .eq('status', 'active')
  .gte('check_in', `${currentYear - 1}-01-01`)
  .lt('check_out', `${currentYear}-01-01`)
```

Pasar `userPrevYearReservations` al `<DoubleCalendar>`.

### 4. `src/components/DoubleCalendar.tsx`

**Cadena de props:** `DoubleCalendarProps` → `MonthGridProps` → `WeekRowProps` → `getDayInfo`.

**`DayCell` — `stateClasses`:**
```ts
'prev-year-blocked': 'cursor-not-allowed text-muted/60',
```

**`DayCell` — `stripedStyle`:**
```ts
state === 'prev-year-blocked'
  ? { background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(220,38,38,0.10) 4px, rgba(220,38,38,0.10) 8px)' }
  : undefined
```

**`Legend`:**
```tsx
<LegendItem striped="prev-year" label="Ya disfrutado" />
```

**`LegendItem`** — ampliar tipo `striped?: 'august' | 'prev-year'` con su `stripedStyle` correspondiente.

---

## Tests (`src/test/lib/calendar.test.ts`)

Nuevos casos en `getDayInfo`:

| Test | Esperado |
|---|---|
| Día dentro de reserva activa del año anterior | `'prev-year-blocked'` |
| Día checkout del año anterior | `'available'` (check_out excluido) |
| Reserva cancelada del año anterior | `'available'` |

Actualizar todos los `getDayInfo` existentes con `[]` como nuevo parámetro 6.

Nuevo caso en `isDaySelectable`:
```ts
it('prev-year-blocked no es seleccionable', () => expect(isDaySelectable('prev-year-blocked')).toBe(false))
```

---

## Ficheros afectados

| Fichero | Acción |
|---|---|
| `supabase/migrations/008_prev_year_blocked.sql` | Crear |
| `src/lib/calendar.ts` | Modificar |
| `src/app/calendario/page.tsx` | Modificar |
| `src/components/DoubleCalendar.tsx` | Modificar |
| `src/test/lib/calendar.test.ts` | Modificar |
