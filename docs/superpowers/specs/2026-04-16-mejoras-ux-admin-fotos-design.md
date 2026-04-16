# Spec: Mejoras UX, admin y fotos — Casa Cervantes

**Fecha:** 2026-04-16  
**Estado:** Aprobado

---

## Resumen

Cinco mejoras independientes sobre la app de reservas Casa Cervantes:

1. Menú hamburguesa para móvil
2. Visibilidad del enlace Admin para todos los administradores
3. Normas y Fotos como secciones privadas (solo usuarios autenticados)
4. Actualización del texto de la norma #03
5. Ordenación de fotos drag & drop en el panel admin

---

## 1. Menú hamburguesa (móvil)

**Problema:** La navegación usa `hidden md:flex`, por lo que en móvil desaparecen los enlaces a Calendario, Mis reservas, Normas y Fotos.

**Solución:**
- Añadir un botón hamburguesa (icono ☰ / ✕) visible solo en `< md` (`md:hidden`).
- Al pulsarlo, se despliega un panel dropdown con todos los enlaces de la sesión actual (admin, privados, públicos).
- Estado local `menuOpen` con `useState` en `Header.tsx`.
- Se cierra automáticamente cuando cambia `pathname` (via `useEffect`).

**Archivos afectados:** `src/components/Header.tsx`

---

## 2. Admin link para múltiples administradores

**Problema:** `Header.tsx` detecta el rol admin con `user?.publicMetadata?.role === 'admin'` (Clerk). Los usuarios añadidos como admin directamente en Supabase tienen `role = 'admin'` en la DB, pero su `publicMetadata` de Clerk no está sincronizada, por lo que no ven el enlace Admin.

**Solución:**
- Convertir `Header` para aceptar `isAdmin?: boolean` como prop.
- Crear `HeaderServer` (server component) en `src/components/HeaderServer.tsx` que:
  - Llama a `auth()` de Clerk para obtener el `userId`.
  - Si hay sesión, llama a `getSupabaseUser(userId)` y comprueba `user.role === 'admin'`.
  - Renderiza `<Header isAdmin={isAdmin} />`.
- Actualizar `src/app/layout.tsx` para importar `HeaderServer` en lugar de `Header`.
- La comprobación de admin en `Header.tsx` pasa a usar la prop en lugar de `publicMetadata`.

**Archivos afectados:** `src/components/Header.tsx`, `src/components/HeaderServer.tsx` (nuevo), `src/app/layout.tsx`

---

## 3. Normas y Fotos privadas

**Problema:** `/normas` es completamente pública (no está en el middleware). `/fotos` está protegida por middleware pero aparece en `NAV_PUBLIC` del Header. Ninguna de las dos debería ser accesible sin autenticación.

**Solución:**
- **Middleware:** Añadir `/normas(.*)` a `isPrivateRoute` en `src/middleware.ts`.
- **Header:** Mover `normas` y `fotos` de `NAV_PUBLIC` a `NAV_PRIVATE`, de modo que solo aparezcan en el menú cuando el usuario está autenticado.

**Archivos afectados:** `src/middleware.ts`, `src/components/Header.tsx`

---

## 4. Texto norma #03

**Cambio:** En `src/app/normas/page.tsx`, actualizar el campo `body` de la norma con `num: '03'`:

- **Antes:** `"El precio es de 30 €/noche. El pago se realiza mediante transferencia bancaria. La aplicación no gestiona pagos."`
- **Después:** `"El precio es de 30 €/noche. El pago se realiza mediante transferencia bancaria. El IBAN es ES32 2100 3922 8401 0044 1553."`

**Archivos afectados:** `src/app/normas/page.tsx`

---

## 5. Ordenación de fotos (admin, drag & drop)

### Migración de datos

La tabla `photos` ya existe en el schema (`001_schema.sql`) con campos `id`, `url`, `storage_path`, `sort_order`, `caption`, `uploaded_by`, `created_at`.

Se crea `supabase/migrations/005_photos_seed.sql` que inserta las 24 fotos actuales (rutas locales `/images/...`) con `sort_order` 1–24.

### Página de fotos

`src/app/fotos/page.tsx` pasa de array hardcodeado a consultar Supabase directamente (server component):
- `createAdminClient().from('photos').select('*').order('sort_order')`
- Pasa `photos.map(p => p.url)` al `PhotoSlider`.

### API de ordenación

Nuevo endpoint `src/app/api/photos/order/route.ts`:
- `PATCH` — recibe `{ order: [{id: string, sort_order: number}[]] }`.
- Verifica que el usuario autenticado tiene `role = 'admin'` en Supabase.
- Actualiza cada fila con el nuevo `sort_order` en la tabla `photos`.
- Devuelve `{ ok: true }` o error 401/403.

### Componente admin

Nuevo `src/components/PhotoOrderAdmin.tsx` (client component):
- Instala y usa `@dnd-kit/core` + `@dnd-kit/sortable`.
- Muestra un grid de miniaturas draggables (igual estilo que las miniaturas del slider).
- Al terminar el drag (`onDragEnd`), reordena el estado local y activa un estado `dirty = true`.
- Botón "Guardar orden" (visible cuando `dirty`) → llama `PATCH /api/photos/order` → toast de confirmación.

### Panel admin

En `src/app/admin/page.tsx`, añadir una sección "Fotos" al final de la página:
- Consulta todas las fotos de Supabase ordenadas por `sort_order`.
- Renderiza `<PhotoOrderAdmin photos={photos} />`.

**Nuevos archivos:**
- `supabase/migrations/005_photos_seed.sql`
- `src/app/api/photos/order/route.ts`
- `src/components/PhotoOrderAdmin.tsx`

**Archivos modificados:**
- `src/app/fotos/page.tsx`
- `src/app/admin/page.tsx`

---

## Dependencias nuevas

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

---

## Orden de implementación sugerido

1. Norma #03 (texto) — cambio trivial
2. Privacidad normas/fotos — middleware + header
3. Admin link multi-admin — server component wrapper
4. Menú hamburguesa — móvil
5. Ordenación fotos — migración + API + componente + admin page
