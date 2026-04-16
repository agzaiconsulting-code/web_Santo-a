# Spec: Mejoras de reservas, tabla admin y badges — Casa Cervantes

**Fecha:** 2026-04-16  
**Estado:** Aprobado

---

## Resumen

Cuatro mejoras independientes:

1. Scroll horizontal en tabla de reservas del panel admin
2. Eliminar restricción de 30 noches máximo por familia
3. Máximo 1 reserva activa por usuario (no-admin)
4. Badge "Cancelada" en rojo (igual estilo que "Activa" en verde)

---

## 1. Scroll horizontal en tabla admin

**Problema:** En `AdminTabs.tsx` el div que envuelve la `<table>` usa `overflow-hidden`, lo que corta las columnas en pantallas pequeñas y hace que la información sea ilegible en móvil.

**Solución:** Cambiar `overflow-hidden` por `overflow-x-auto` en el div contenedor de la tabla. Añadir `min-w-[600px]` a la `<table>` para que las columnas mantengan su ancho mínimo antes de activar el scroll.

**Archivos afectados:** `src/components/AdminTabs.tsx`

---

## 2. Eliminar restricción de 30 noches por familia

**Problema:** La cuota de 30 noches en la ventana de 4 meses ya no refleja las reglas del grupo. Hay que eliminarla completamente del sistema.

**Cambios:**

### SQL — Nueva migración `007_remove_quota_and_one_active.sql`

Reescribir `create_reservation` sin el paso 6 (cuota familiar). Se mantienen todos los demás checks:
1. Fecha de entrada no en el pasado
2. Año natural
3. Antelación máxima 4 meses
4. Máximo 15 noches consecutivas
5. Sin solapamiento
6. ~~Cuota familiar~~ → **ELIMINADO**
7. Restricción agosto (renumerado como paso 6)
8. INSERT (renumerado como paso 7)

### Frontend

- **`src/lib/calendar.ts`**: eliminar el estado `'quota-full'` de `DayState` y el bloque que lo retorna (el check `if (quotaUsed >= 30)`). Eliminar el parámetro `quotaUsed` de la firma de `getDayInfo`.
- **`src/components/FamilyQuotaIndicator.tsx`**: eliminar el componente completo.
- **`src/app/calendario/page.tsx`**: eliminar la 3ª query del `Promise.all` (RPC `get_family_quota`), eliminar la variable `quotaUsed`, eliminar `<FamilyQuotaIndicator>` del JSX.
- **`src/components/DoubleCalendar.tsx`**: eliminar la prop `quotaUsed` de la interfaz y de los usos internos.
- **`src/types/index.ts`**: eliminar `'quota-full'` de `DayState`.

**Archivos afectados:** `supabase/migrations/007_remove_quota_and_one_active.sql` (nuevo), `src/lib/calendar.ts`, `src/components/FamilyQuotaIndicator.tsx`, `src/app/calendario/page.tsx`, `src/components/DoubleCalendar.tsx`, `src/types/index.ts`

---

## 3. Máximo 1 reserva activa por usuario (no-admin)

**Regla:** Un usuario normal no puede crear una nueva reserva si ya tiene una reserva activa cuya `check_out >= hoy`. Una reserva cuya fecha de salida ya pasó no bloquea la creación de nuevas reservas.

**El administrador queda completamente exento** — puede crear tantas reservas como quiera, tanto para sí mismo como para otros miembros de la familia.

**Nota:** Cuando un admin crea una reserva usando `for_user_id`, tampoco se aplica la restricción (el caller es admin).

### SQL — En la misma migración `007_remove_quota_and_one_active.sql`

Añadir nuevo paso en `create_reservation` (después del check de solapamiento, antes del check de agosto):

```sql
-- 6. Un usuario no-admin solo puede tener 1 reserva activa en curso
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM users WHERE id = p_user_id;
  
  IF v_caller_role != 'admin' THEN
    IF EXISTS (
      SELECT 1 FROM reservations
      WHERE user_id = p_user_id
        AND status   = 'active'
        AND check_out > CURRENT_DATE
    ) THEN
      RAISE EXCEPTION 'No puedes realizar otra reserva debido a que tienes una reserva activa.';
    END IF;
  END IF;
```

**Nota importante:** `p_user_id` es el usuario para quien se crea la reserva (puede ser un familiar si el admin usa `for_user_id`). Sin embargo, el bypass admin se basa en el rol del `p_user_id`. Para que el admin pueda crear reservas para otros usuarios que ya tienen una activa, necesitamos pasar el rol del caller (quien invoca el RPC) como parámetro adicional.

**Solución:** Añadir parámetro `p_caller_is_admin BOOLEAN DEFAULT false` a `create_reservation`. El API route lo pasa como `caller.role === 'admin'`. El check solo aplica si `NOT p_caller_is_admin`.

### API Route

En `src/app/api/reservations/route.ts`, pasar `p_caller_is_admin: caller.role === 'admin'` al llamar al RPC.

### Frontend — Aviso preventivo

En `src/app/calendario/page.tsx`: calcular `hasActiveReservation` — si el usuario efectivo no es admin, comprobar si `reservations` (ya cargadas) contienen alguna reserva del usuario con `check_out >= hoy`.

En `src/components/DoubleCalendar.tsx`: recibir prop `hasActiveReservation?: boolean`. Si es `true` y el usuario no es admin, mostrar un banner de aviso en la parte superior del calendario con el mensaje:  
> *"No puedes realizar otra reserva debido a que tienes una reserva activa."*

El calendario sigue siendo visible pero la selección queda bloqueada (el banner informa al usuario de por qué no puede seleccionar).

**Archivos afectados:** (misma migración 007), `src/app/api/reservations/route.ts`, `src/app/calendario/page.tsx`, `src/components/DoubleCalendar.tsx`

---

## 4. Badge "Cancelada" en rojo

**Cambio:** En ambos componentes que muestran el badge de estado, reemplazar el estilo del badge cancelada de `bg-stone text-muted` (gris) a `bg-red-100 text-red-700` (rojo), igual que el badge activa usa `bg-green-100 text-green-700`.

**Archivos afectados:**
- `src/components/ReservationList.tsx` — componente interno `ReservationCard`, línea del badge cancelada
- `src/components/AdminTabs.tsx` — celda de estado en la tabla, línea del badge cancelada

---

## Orden de implementación sugerido

1. Badge cancelada en rojo (trivial)
2. Scroll horizontal tabla admin (trivial)
3. Eliminar restricción 30 noches (SQL + varios ficheros frontend)
4. Límite 1 reserva activa (SQL + API + frontend)

---

## Tests a actualizar

- `src/test/lib/calendar.test.ts` — si hay tests que cubren `quota-full`, eliminarlos.
- `src/test/lib/calendar.test.ts` — verificar que `getDayInfo` ya no recibe `quotaUsed`.
