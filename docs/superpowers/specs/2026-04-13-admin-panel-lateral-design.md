# Spec: Admin Dashboard + Panel Lateral de Reserva

**Fecha:** 2026-04-13
**Estado:** Aprobado

---

## Objetivo

Tres mejoras relacionadas:
1. Reemplazar el popup de confirmación de reserva por un panel lateral fijo (todos los usuarios).
2. Dar al administrador una vista diferenciada en `/reservas` con acceso a todas las reservas y capacidad de crear/cancelar.
3. Crear la página `/admin` con un dashboard de métricas anuales y tabla de reservas por mes.

---

## 1. `/calendario` — Panel lateral de confirmación

### Cambio de layout

El layout de la página cambia de columna única a una rejilla de dos columnas:

```
grid-cols-[1fr_300px]
```

- Columna izquierda: calendario doble (componente `DoubleCalendar`) + barra de cuota familiar
- Columna derecha: panel `ReservationPanel` (nuevo componente Client Component)

El componente `ReservationConfirmModal` se elimina. El panel sustituye toda su funcionalidad.

### Comportamiento del panel (`ReservationPanel`)

| Estado | Contenido |
|---|---|
| Sin selección | Icono + "Haz clic en el día de entrada para comenzar" |
| Entrada seleccionada | Fecha de entrada + "Ahora selecciona el día de salida" |
| Rango completo | Entrada / Salida / Noches / Total (noches × 30€) / nota de transferencia / botón "Confirmar" / enlace "Cancelar selección" |
| Cargando | Botón con spinner, deshabilitado |
| Error | Mensaje de error en rojo dentro del panel |

El panel recibe `selectedStart`, `selectedEnd`, `onConfirm`, `onCancel`, `isLoading`, `errorMsg` como props desde `DoubleCalendar`.

### Modo admin en el panel

Si el componente recibe `forUser?: User` (prop opcional), el panel muestra:
- Cabecera: "Reservando para: **Nombre Apellido** (Fam. X)"
- El resto igual

La llamada a la API incluirá el `userId` del familiar, no el del admin.

---

## 2. `/reservas` — Vista diferenciada por rol

### Usuario normal (sin cambios)

Lista de sus propias reservas activas + historial de canceladas. Botón cancelar en reservas activas.

### Vista admin

**Sección superior — Crear reserva para familiar:**
- Dropdown con todos los usuarios del sistema (nombre + familia)
- Botón "Ir al calendario" → navega a `/calendario?for=<userId>`
- El dropdown muestra: "Selecciona un familiar..." como placeholder

**Tabla de todas las reservas:**
- Columnas: Persona · Familia · Entrada · Salida · Noches · Total · Estado · Acción
- Columna extra "Familia" no existe en la vista de usuario normal
- Botón "Cancelar" en cada reserva activa (llama a `PATCH /api/reservations/[id]`)
- Reservas ordenadas por `check_in` descendente
- Badge de estado: verde (activa) / rojo (cancelada)

**Detección de rol:** La página `/reservas` lee `currentUser.role`. Si es `'admin'`, carga con `Promise.all`: todos los usuarios (`users` ordenados por `family_id, first_name`) y todas las reservas activas + canceladas del año. Si es `'user'`, comportamiento actual.

---

## 3. `/calendario?for=<userId>` — Modo admin crear reserva

La página `/calendario` acepta un searchParam opcional `for`.

**Validaciones en el servidor:**
- Si `for` está presente y el usuario actual NO es admin → ignorar el param (seguridad)
- Si `for` está presente y el usuario es admin → cargar el perfil del familiar como `targetUser`
- Si `targetUser` no existe → redirect a `/reservas`

**Comportamiento:**
- El calendario muestra la disponibilidad y restricciones del `targetUser` (cuota, agosto, etc.)
- El panel lateral muestra "Reservando para: Nombre Apellido (Fam. X)"
- La API POST se llama con el `userId` del familiar en el body: `{ check_in, check_out, for_user_id }`
- `POST /api/reservations` valida que si `for_user_id` está presente, el caller sea admin

---

## 4. `/admin` — Dashboard

### Acceso

Server Component. Si `currentUser.role !== 'admin'` → redirect a `/`.

### Layout

```
Stats bar (4 tarjetas)
─────────────────────
Tabs de mes (Ene–Dic)
─────────────────────
Tabla de reservas del mes seleccionado
```

### Stats bar

| Métrica | Fuente |
|---|---|
| Reservas activas | `COUNT` de reservas con `status = 'active'` |
| Noches totales (año actual) | `SUM(nights)` de reservas activas del año |
| Ingresos (año actual) | `SUM(total_price)` de reservas activas del año |
| Familia de agosto | `august_assignments` para el año actual |

### Tabs de mes

- 12 tabs: Ene, Feb, ... Dic
- El tab activo por defecto es el mes actual
- El tab activo se gestiona como estado del Client Component `AdminTabs`
- Tabs con reservas muestran un punto dorado

### Tabla por mes (dentro de `AdminTabs`)

Columnas: Persona · Familia · Entrada · Salida · Noches · Total · Estado

Solo lectura. Ordenada por `check_in` ascendente. Incluye reservas canceladas (con badge rojo).

### Arquitectura

- `/admin/page.tsx`: Server Component — carga stats, todas las reservas del año, familia agosto → pasa todo al Client Component
- `AdminTabs`: Client Component — gestiona tab activo, filtra reservas por mes client-side (sin llamadas adicionales)

Los datos se cargan una sola vez en el servidor y se filtran en el cliente por mes. No hay llamadas adicionales al cambiar de tab.

---

## Archivos afectados / nuevos

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/app/calendario/page.tsx` | Modificar | Leer searchParam `for`, pasar `forUser` al calendario |
| `src/components/DoubleCalendar.tsx` | Modificar | Aceptar `forUser?`, pasar estado de selección a `ReservationPanel` |
| `src/components/ReservationPanel.tsx` | Nuevo | Panel lateral de confirmación |
| `src/components/ReservationConfirmModal.tsx` | Eliminar | Sustituido por ReservationPanel |
| `src/app/reservas/page.tsx` | Modificar | Vista diferenciada admin/user |
| `src/components/ReservationList.tsx` | Modificar | Recibir `isAdmin`, mostrar columna familia, sección crear reserva |
| `src/app/admin/page.tsx` | Nuevo | Dashboard con stats + tabs |
| `src/components/AdminTabs.tsx` | Nuevo | Client Component con tabs y tabla |
| `src/app/api/reservations/route.ts` | Modificar | Aceptar `for_user_id` opcional, validar que caller sea admin |

---

## Seguridad

- `/admin` redirige a `/` si `role !== 'admin'`
- `?for=<userId>` en `/calendario` se ignora si `role !== 'admin'`
- `POST /api/reservations` con `for_user_id` rechaza si `role !== 'admin'` (verificado contra Supabase, no solo Clerk)
- Las cancelaciones en la vista admin usan el mismo endpoint existente `PATCH /api/reservations/[id]`, que ya verifica autenticación; se añade validación de que el caller es admin o propietario de la reserva
