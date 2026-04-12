# Casa Cervantes — Diseño de la aplicación

**Fecha:** 2026-04-12
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Clerk · Supabase · Resend · Vercel

---

## 1. Contexto

Aplicación web para gestionar las reservas de una casa familiar compartida en Santoña, Cantabria (Calle Cervantes). 7 familias con sus hijos. La web permite reservar noches, consultar normas, ver fotos y gestionar un calendario compartido.

No hay pasarela de pago: el precio es 30 €/noche, pagado por transferencia bancaria fuera de la app.

---

## 2. Diseño visual

### Paleta — Cantábrico dorado

| Token | Valor | Uso |
|---|---|---|
| `--navy` | `#1D3557` | Fondo hero, header admin, panel reserva, textos principales |
| `--blue` | `#4A7C9E` | Días reservados, iconos, bordes activos |
| `--gold` | `#C4943A` | CTAs, precios, acento decorativo |
| `--light-blue` | `#A8C8E0` | Textos secundarios sobre fondo marino |
| `--bg` | `#F7F5F2` | Fondo general (blanco piedra) |
| `--border` | `#E5E0D8` | Bordes de tarjetas y separadores |
| `--muted` | `#6A7A88` | Textos auxiliares |

### Tipografía

- **Display / títulos:** Playfair Display (400, 600, 700, italic)
- **Cuerpo / UI:** DM Sans (300, 400, 500, 600)
- Nunca: Inter, Arial, Roboto

### Textura y efectos

- Fondo `#F7F5F2` (no plano puro)
- Sombras suaves: `0 4px 24px rgba(29,53,87,0.08)`
- Animaciones de página: `fade + translateY` sutil (Framer Motion o CSS)
- Hover states en todos los elementos interactivos

---

## 3. Arquitectura

### Enfoque: Híbrido Server Components + Client Islands

```
Browser
  │
  ├── Next.js App Router (Vercel)
  │     ├── Middleware (Clerk) — protege rutas privadas
  │     ├── Server Components — render inicial, datos de solo lectura
  │     ├── Client Components — Calendar, modales, galería, formularios
  │     └── API Routes
  │           ├── POST /api/reservations          → create_reservation() RPC
  │           ├── PATCH /api/reservations/[id]    → cancel_reservation() RPC
  │           ├── POST/DELETE /api/photos         → Supabase Storage
  │           ├── GET /api/accounting             → accounting_summary view
  │           ├── POST /api/send-email            → Resend
  │           └── POST /api/webhooks/clerk        → sincronizar usuario
  │
  ├── Clerk — autenticación, sin signup público, solo invitación
  │     └── JWT con sub = clerk_user_id → Supabase RLS lo verifica
  │
  ├── Supabase (PostgreSQL + Storage)
  │     ├── RLS en todas las tablas
  │     ├── Funciones RPC: create_reservation, cancel_reservation
  │     ├── Vista: accounting_summary
  │     └── Storage bucket "photos" — lectura pública
  │
  └── Resend — emails transaccionales
```

### Protección de rutas (middleware Clerk)

| Patrón | Acceso |
|---|---|
| `/`, `/normas` | Público |
| `/fotos`, `/calendario`, `/reservas` | Cualquier usuario autenticado |
| `/admin/*` | Solo rol `admin` |
| `/sign-in` | Público (no hay `/sign-up`) |

### Configuración de contraseñas

- **Contraseña inicial** para todos los usuarios: `casasantoña` — el admin la asigna manualmente al crear cada cuenta en el dashboard de Clerk.
- **Cambio de contraseña**: el usuario puede cambiar su contraseña desde la página de perfil de Clerk o mediante el flujo de "olvidé mi contraseña" (Clerk envía un email de restablecimiento al correo del usuario).
- El signup público está deshabilitado en Clerk — nadie puede crear una cuenta por su cuenta.
- No hay página `/sign-up` en la app.

### Sincronización Clerk → Supabase

Al primer login, el webhook de Clerk (`user.created`) inserta un registro en la tabla `users` con `clerk_user_id`, email, nombre y apellidos. `family_id` queda a NULL hasta que el admin lo asigne. Un usuario sin `family_id` asignado puede hacer login pero no puede crear reservas (el RPC valida que tenga familia).

La asignación de `family_id` y `role` se hace desde el panel admin de la app (`/admin/usuarios`, futuro) o directamente en el dashboard de Supabase.

### API Routes vs RLS

Las API Routes usan `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS) y verifican propiedad en código de aplicación (ej: comprobar que el `clerk_user_id` del token coincide con el `user_id` de la reserva). El RLS opera cuando Server Components leen datos públicos usando la anon key + JWT de Clerk.

---

## 4. Base de datos

### Tablas

#### `families`
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  family_id UUID REFERENCES families(id),              -- nullable: el admin asigna la familia tras crear el usuario
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  receive_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `august_assignments`
```sql
CREATE TABLE august_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  family_id UUID REFERENCES families(id) NOT NULL,
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year)
);
```

#### `reservations`
```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS ((check_out - check_in) * 30) STORED,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT valid_dates CHECK (check_out > check_in),
  CONSTRAINT max_consecutive_nights CHECK ((check_out - check_in) <= 15)
);
```

#### `audit_log`
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('reservation_created', 'reservation_cancelled', 'reservation_modified')),
  reservation_id UUID REFERENCES reservations(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `photos`
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Vista `accounting_summary`

```sql
CREATE OR REPLACE VIEW accounting_summary AS
SELECT
  f.id AS family_id,
  f.name AS family_name,
  EXTRACT(YEAR FROM r.check_in)::INTEGER AS year,
  EXTRACT(MONTH FROM r.check_in)::INTEGER AS month,
  COUNT(r.id) AS total_reservations,
  SUM(r.nights) AS total_nights,
  SUM(r.total_price) AS total_income
FROM reservations r
JOIN users u ON r.user_id = u.id
JOIN families f ON u.family_id = f.id
WHERE r.status = 'active'
GROUP BY f.id, f.name,
  EXTRACT(YEAR FROM r.check_in),
  EXTRACT(MONTH FROM r.check_in)
ORDER BY year, month, f.name;
```

### Row Level Security

| Tabla | Política |
|---|---|
| `users` | Cada usuario lee su propio registro. Admins leen todos. |
| `reservations` | Todos los autenticados pueden leer. Solo el propietario puede cancelar las suyas. Solo autenticados pueden crear. |
| `audit_log` | Solo admins pueden leer. |
| `august_assignments` | Todos pueden leer. Solo admins pueden insertar/actualizar. |
| `families` | Todos pueden leer. |
| `photos` | Todos pueden leer. Solo admins pueden insertar/actualizar/eliminar. |

### Supabase Storage

Bucket `photos`: lectura pública, escritura solo para admins autenticados.

---

## 5. Funciones RPC

### `create_reservation(p_user_id, p_check_in, p_check_out)`

Validaciones en orden (todas atómicas, hacen RAISE EXCEPTION si fallan):

1. **Año natural** — check_in y check_out en el año en curso (excepción: check_out = 1 ene año siguiente si check_in es 31 dic)
2. **Antelación máxima** — check_in ≤ hoy + 4 meses
3. **Máximo 15 noches** — (check_out - check_in) ≤ 15
4. **Sin solapamiento** — ninguna reserva activa cubre ese rango
5. **Cuota familiar** — suma de noches activas de la familia en la ventana (hoy → hoy + 4 meses) + noches nuevas ≤ 30
6. **Restricción agosto** — si alguna fecha cae en agosto, el usuario debe pertenecer a la familia asignada ese año

Si todas pasan: inserta en `reservations` + `audit_log` (transacción atómica). Devuelve el UUID de la nueva reserva.

### `cancel_reservation(p_user_id, p_reservation_id, p_is_admin)`

1. Verifica que la reserva existe y está activa
2. Verifica que el usuario es el propietario o `p_is_admin = true`
3. Marca `status = 'cancelled'`, actualiza `cancelled_at` y `updated_at`
4. Inserta en `audit_log`
5. Devuelve `true`

---

## 6. Páginas y componentes

### Estructura de carpetas

```
/src
  /app
    /page.tsx                        — Landing (público)
    /normas/page.tsx                 — Normas (público)
    /fotos/page.tsx                  — Galería (autenticado)
    /calendario/page.tsx             — Calendario + reservas (autenticado)
    /reservas/page.tsx               — Mis reservas (autenticado)
    /admin
      /page.tsx                      — Dashboard admin
      /reservas/page.tsx             — Todas las reservas
      /audit/page.tsx                — Audit log
      /familias/page.tsx             — Gestión agosto
      /fotos/page.tsx                — Gestión galería
      /contabilidad/page.tsx         — Hoja de contabilidad
    /api
      /reservations/route.ts
      /reservations/[id]/route.ts
      /photos/route.ts
      /accounting/route.ts
      /send-email/route.ts
      /webhooks/clerk/route.ts
    /sign-in/[[...sign-in]]/page.tsx — Clerk sign-in
  /components
    /Header.tsx
    /DoubleCalendar.tsx
    /ReservationConfirmModal.tsx
    /CancelConfirmModal.tsx
    /PhotoGallery.tsx
    /PhotoUploader.tsx
    /AccountingDashboard.tsx
    /AuditLog.tsx
    /AugustManager.tsx
    /FamilyQuotaIndicator.tsx        — "Tu familia: X / 30 noches"
  /lib
    /supabase.ts                     — clientes server + client
    /resend.ts
    /storage.ts
    /utils.ts
  /types
    /index.ts
```

### Componentes principales

#### `<DoubleCalendar />`
- Dos meses en paralelo, navegables con botones ← →
- Estados visuales por día (ver sección 7)
- Click en día reservado → tooltip con nombre y apellidos
- Selección de rango: 1er clic = entrada, 2º clic = salida
- Al completar rango → abre `<ReservationConfirmModal />`

#### `<ReservationConfirmModal />`
- Muestra: fechas, noches, precio total, aviso de pago por transferencia
- Botón "Confirmar" → llama a `POST /api/reservations`
- Botón "Cancelar" → cierra sin acción

#### `<FamilyQuotaIndicator />`
- Barra de progreso: noches usadas / 30 en la ventana de 4 meses
- Visible en la cabecera del calendario
- Se actualiza tras cada reserva

---

## 7. Estados visuales del calendario

| Estado | Visual |
|---|---|
| Día libre | Fondo neutro, hover azul suave |
| Día reservado | Fondo `--reserved-bg` (azul claro) + nombre en miniatura |
| Agosto (otra familia) | Rayas diagonales grises + cursor not-allowed |
| Agosto (tu familia) | Como día libre — seleccionable |
| Cuota familiar agotada | Rayas diagonales suaves (diferente a agosto) + cursor not-allowed |
| Entrada / salida seleccionada | Fondo `--navy` |
| Rango seleccionado | Fondo dorado suave `--range-bg` |
| Hoy | Punto dorado en esquina superior derecha |
| Pasado | Opacidad reducida, no seleccionable |

---

## 8. Lógica de negocio — reglas completas

| Regla | Detalle |
|---|---|
| Precio | 30 €/noche. Pago por transferencia fuera de la app. |
| Máximo consecutivo | 15 noches por reserva |
| Antelación máxima | 4 meses desde hoy |
| Año natural | Solo el año en curso. El 1 de enero se abre el nuevo año. |
| Sin solapamiento | No se admiten reservas que se crucen con otras activas |
| **Cuota familiar** | **Máximo 30 noches por familia en la ventana de 4 meses** |
| Agosto restringido | Solo la familia asignada ese año puede reservar en agosto |
| Cancelaciones | Solo el propietario o un admin. Sin reembolso salvo causa mayor o sustitución. |

---

## 9. Emails (Resend)

Tres plantillas con el diseño de la web (azul marino, oro, Playfair Display):

| Evento | Destinatarios | Contenido |
|---|---|---|
| Reserva creada | Todos con `receive_notifications = true` | Quién reservó, fechas, noches, precio |
| Reserva cancelada | Todos con `receive_notifications = true` | Quién canceló, fechas liberadas |
| Cancelación por admin | Propietario + suscritos | Ídem + nota "cancelado por administrador" |

Todos los emails incluyen enlace al calendario.

---

## 10. Galería de fotos

- Almacenamiento en Supabase Storage (bucket `photos`, acceso público)
- `/fotos` — grid 3 columnas (escritorio), lightbox al clicar, caption opcional
- `/admin/fotos` — subida múltiple drag & drop, reordenación drag & drop (campo `sort_order`), eliminación con confirmación

---

## 11. Panel de contabilidad

Tabla pivotada: familias (filas) × meses del año (columnas).

- Filtro por año
- Solo reservas `status = 'active'`
- Fila de totales por mes al pie
- Columna de total anual por familia
- Columna adicional: noches usadas en ventana 4 meses / 30 (indicador de cuota)
- Celdas vacías (`—`) para meses sin reservas

---

## 12. Seed de familias y usuarios

Migración inicial con los datos reales. Los usuarios se crean con `clerk_user_id = NULL` hasta que hagan su primer login y el webhook lo rellene. El campo `email` se actualizará también al hacer login.

```sql
-- Insertar familias
INSERT INTO families (id, name) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Familia Terina'),
  ('f1000000-0000-0000-0000-000000000002', 'Familia Rafa'),
  ('f1000000-0000-0000-0000-000000000003', 'Familia Amalia'),
  ('f1000000-0000-0000-0000-000000000004', 'Familia Ramón'),
  ('f1000000-0000-0000-0000-000000000005', 'Familia Carlos'),
  ('f1000000-0000-0000-0000-000000000006', 'Familia Luis'),
  ('f1000000-0000-0000-0000-000000000007', 'Familia Ignacio');

-- Miembros por familia (clerk_user_id se rellena al primer login)
-- Familia Terina
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Moncho', 'Terina', 'f1000000-0000-0000-0000-000000000001', 'moncho@placeholder.local'),
  ('Rafa',   'Terina', 'f1000000-0000-0000-0000-000000000001', 'rafa.terina@placeholder.local');

-- Familia Rafa
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Susana',     'Rafa', 'f1000000-0000-0000-0000-000000000002', 'susana@placeholder.local'),
  ('Cristina',   'Rafa', 'f1000000-0000-0000-0000-000000000002', 'cristina@placeholder.local'),
  ('Jose María', 'Rafa', 'f1000000-0000-0000-0000-000000000002', 'josemaria@placeholder.local'),
  ('Tere',       'Rafa', 'f1000000-0000-0000-0000-000000000002', 'tere@placeholder.local'),
  ('Pachi',      'Rafa', 'f1000000-0000-0000-0000-000000000002', 'pachi@placeholder.local');

-- Familia Amalia
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Amalia',   'Amalia', 'f1000000-0000-0000-0000-000000000003', 'amalia@placeholder.local'),
  ('Feliz',    'Amalia', 'f1000000-0000-0000-0000-000000000003', 'feliz@placeholder.local'),
  ('María',    'Amalia', 'f1000000-0000-0000-0000-000000000003', 'maria.amalia@placeholder.local'),
  ('Beatriz',  'Amalia', 'f1000000-0000-0000-0000-000000000003', 'beatriz@placeholder.local'),
  ('Santiago', 'Amalia', 'f1000000-0000-0000-0000-000000000003', 'santiago@placeholder.local');

-- Familia Ramón
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Anusca',    'Ramón', 'f1000000-0000-0000-0000-000000000004', 'anusca@placeholder.local'),
  ('Carmela',   'Ramón', 'f1000000-0000-0000-0000-000000000004', 'carmela@placeholder.local'),
  ('Ramonin',   'Ramón', 'f1000000-0000-0000-0000-000000000004', 'ramonin@placeholder.local'),
  ('Francisco', 'Ramón', 'f1000000-0000-0000-0000-000000000004', 'francisco@placeholder.local');

-- Familia Carlos
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Alicia', 'Carlos', 'f1000000-0000-0000-0000-000000000005', 'alicia@placeholder.local'),
  ('Olga',   'Carlos', 'f1000000-0000-0000-0000-000000000005', 'olga@placeholder.local'),
  ('Carlos', 'Carlos', 'f1000000-0000-0000-0000-000000000005', 'carlos@placeholder.local'),
  ('Javier', 'Carlos', 'f1000000-0000-0000-0000-000000000005', 'javier@placeholder.local');

-- Familia Luis
INSERT INTO users (first_name, last_name, family_id, email, role) VALUES
  ('Ignacio', 'Luis',   'f1000000-0000-0000-0000-000000000006', 'ignacio.luis@placeholder.local',    'user'),
  ('Kike',    'Luis',   'f1000000-0000-0000-0000-000000000006', 'kike@placeholder.local',             'user'),
  ('Ramon',   'Luis',   'f1000000-0000-0000-0000-000000000006', 'ramountainbike@gmail.com',           'user'),
  ('Nano',    'Luis',   'f1000000-0000-0000-0000-000000000006', 'nano@placeholder.local',             'user'),
  ('Adrian',  'Gómez',  'f1000000-0000-0000-0000-000000000006', 'adrian.gomez.dejuan@gmail.com',     'admin');

-- Familia Ignacio
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Tate', 'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'tate@placeholder.local'),
  ('Viki', 'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'viki@placeholder.local'),
  ('Oje',  'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'oje@placeholder.local');
```

**Notas sobre el seed:**
- Los emails `@placeholder.local` se actualizan automáticamente cuando cada usuario hace login por primera vez (el webhook de Clerk actualiza el registro buscando por `first_name` + `last_name` o el admin los actualiza previamente con los emails reales).
- El admin deberá asignar `clerk_user_id` manualmente o via webhook una vez que cada persona acepte su invitación de Clerk.
- La columna `clerk_user_id` en `users` puede ser NULL hasta que el usuario haga login. La UNIQUE constraint se aplica solo a valores no-NULL en PostgreSQL.

---

## 14. Variables de entorno

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_PRICE_PER_NIGHT=30
```

---

## 15. Normas de la casa (contenido)

1. **Máximo 15 días seguidos** — No se puede reservar más de 15 noches consecutivas.
2. **Máximo 30 noches por familia** — Cada familia tiene un máximo de 30 noches en la ventana de reserva de 4 meses.
3. **Pago por transferencia** — 30 €/noche. El pago no se gestiona dentro de la app.
4. **Cancelaciones** — Sin reembolso salvo sustitución del período o causa de fuerza mayor.
5. **Agosto restringido** — Solo puede reservar en agosto la familia a la que le corresponde ese año.
6. **Antelación máxima de 4 meses** — No se pueden hacer reservas con más de 4 meses de antelación.
7. **Año natural** — Solo se puede reservar en el año en curso.
