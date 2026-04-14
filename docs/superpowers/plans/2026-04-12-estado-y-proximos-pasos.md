# Estado del proyecto — Casa Cervantes

> Última actualización: 2026-04-12
> Plan 1 (Fundación) completado al 100%. Pendiente configuración manual antes del Plan 2.

---

## Estado del Plan 1

Todos los tasks implementados, revisados y aprobados (spec + code quality).

| Task | Descripción | Commit |
|------|-------------|--------|
| T1 | Scaffold Next.js 14 + dependencias | `bb0d7ad` |
| T1 fix | Bajar framer-motion a v11 (React 18) | `f9e46e0` |
| T2 | TypeScript types (src/types/index.ts) | `4fb75a5` |
| T3 | Design system Tailwind + fuentes | `5f84784` |
| T4 | Clientes Supabase + utilidades (24 tests) | `1542f2b` |
| T5 | Clerk middleware (rutas privadas/públicas) | `63205d6` |
| T6 | SQL schema (001_schema.sql) | `6777f89` |
| T7 | SQL RLS (002_rls.sql) | `83ad0c5` |
| T8 | SQL RPCs (003_rpc.sql) | `09e8ba6` |
| T9 | SQL seed (004_seed.sql) | `9f1ad5d` |
| T10 | Webhook Clerk → Supabase | `8493b31` |
| T11 | Header component + layout.tsx | `1328e0a` |
| T12 | Landing page (hero + stats + descripción) | `a5c645d` |
| T13 | Página de normas (7 normas) | `0afb70c` |
| T14 | Página de sign-in (Clerk, sin registro) | `8afbe9d` |

---

## Pasos manuales pendientes (hacer ANTES del Plan 2)

### Paso 1 — Ejecutar migraciones SQL en Supabase

Los archivos SQL están creados en `supabase/migrations/` pero hay que ejecutarlos manualmente.

1. Ir a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor → New query**
2. Ejecutar los 4 archivos en este orden exacto (uno a uno, esperar "Success" entre cada uno):

```
supabase/migrations/001_schema.sql   ← tablas + vista + índices
supabase/migrations/002_rls.sql      ← Row Level Security + policies
supabase/migrations/003_rpc.sql      ← RPCs: create_reservation, cancel_reservation, get_family_quota
supabase/migrations/004_seed.sql     ← 7 familias + 21 miembros
```

**Verificación:** Table Editor → `families` debe tener 7 filas, `users` 21 filas (Adrian con role=admin).

---

### Paso 2 — Configurar Clerk Dashboard

1. Ir a [dashboard.clerk.com](https://dashboard.clerk.com) → tu aplicación

2. **Crear los 21 usuarios** (Configure → Users → Create user):
   - Contraseña inicial para todos: `casasantoña`
   - Usar los nombres y emails exactos del seed (ver tabla abajo)
   - Los usuarios con `@placeholder.local` necesitan un email real o se crean sin email por ahora

3. **Configurar el webhook** (Configure → Webhooks → Add Endpoint):
   - URL: `https://<tu-dominio>.vercel.app/api/webhooks/clerk`
   - Para desarrollo local: usar ngrok (`ngrok http 3000`) y usar la URL HTTPS que genera
   - Eventos a suscribir: `user.created`, `user.updated`
   - Copiar el **Signing Secret** → pegarlo en `.env.local` como `CLERK_WEBHOOK_SECRET`

**Usuarios con email real conocido:**
| Nombre | Email real |
|--------|-----------|
| Adrian Gómez (admin) | adrian.gomez.dejuan@gmail.com |
| Ramon Luis | ramountainbike@gmail.com |

---

### Paso 3 — Rellenar `.env.local`

El archivo está en la raíz del proyecto. Rellenar con las claves reales:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← NUNCA exponer en el cliente

# Resend (se usa en Plan 3)
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_PRICE_PER_NIGHT=30
```

Las claves de Supabase están en: Settings → API.
Las claves de Clerk están en: Configure → API Keys.

---

### Paso 4 — Verificar en local

```bash
npm run dev
```

Comprobar:
- http://localhost:3000 → hero con foto, stats bar, descripción ✓
- http://localhost:3000/normas → 7 normas con diseño ✓
- http://localhost:3000/sign-in → formulario Clerk, sin registro ✓
- http://localhost:3000/calendario → redirige a /sign-in ✓

---

## Plan 2 — Calendario y Reservas

Archivo del plan: `docs/superpowers/plans/2026-04-12-plan-1-foundation.md` (última sección)

Lo que construye el Plan 2:
- `<DoubleCalendar />` con todos los estados visuales (libre, ocupado, seleccionado, hoy)
- `<FamilyQuotaIndicator />` — barra de progreso 0–30 noches
- `<ReservationConfirmModal />` y `<CancelConfirmModal />`
- API routes `POST /api/reservations` y `PATCH /api/reservations/[id]`
- Página `/calendario` (vista principal con doble mes en paralelo)
- Página `/reservas` (mis reservas activas + historial)

**Para arrancar el Plan 2:** decirle a Claude "arranca el Plan 2 de Casa Cervantes — el plan está en `docs/superpowers/plans/`".

---

## Notas técnicas importantes

- **Clerk v5** (no v6/v7): el auth middleware usa `auth().protect()`, no `auth.protect()`
- **framer-motion v11** (no v12): v12 requiere React 19, el proyecto usa React 18
- **Supabase service_role**: todas las operaciones server-side usan `createAdminClient()` que bypasa RLS
- **RLS como defensa en profundidad**: las políticas existen pero el server nunca las activa (service_role)
- **Webhook user matching**: al primer login, el webhook busca al usuario por first_name + last_name con clerk_user_id NULL para enlazarlo con el seed. Si no encuentra, crea uno nuevo con family_id=NULL
