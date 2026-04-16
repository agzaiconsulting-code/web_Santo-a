# Mejoras UX, Admin multi-rol y Fotos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 5 mejoras en Casa Cervantes: menú móvil, admin multi-rol, privacidad normas/fotos, texto norma #03 y ordenación de fotos con drag & drop.

**Architecture:** Cambios de contenido y middleware simples (tareas 1–3), refactor del Header con prop `isAdmin` pasada desde `layout.tsx` (tarea 4), y sistema completo de fotos con tabla Supabase + API + componente dnd-kit (tareas 5–9).

**Tech Stack:** Next.js 14 App Router, Clerk (`@clerk/nextjs`), Supabase (`@supabase/supabase-js`), `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, Vitest, Tailwind CSS.

---

## File Map

| Fichero | Acción | Propósito |
|---|---|---|
| `src/app/normas/page.tsx` | Modificar | Texto norma #03 |
| `src/middleware.ts` | Modificar | Añadir `/normas` a rutas privadas |
| `src/components/Header.tsx` | Modificar | Prop `isAdmin`, mover nav, hamburguesa |
| `src/app/layout.tsx` | Modificar | Pasar `isAdmin` desde Supabase a Header |
| `supabase/migrations/005_photos_seed.sql` | Crear | Seed de las 24 fotos en tabla photos |
| `src/app/fotos/page.tsx` | Modificar | Leer fotos de Supabase en lugar de array |
| `src/app/api/photos/order/route.ts` | Crear | PATCH endpoint para guardar orden |
| `src/components/PhotoOrderAdmin.tsx` | Crear | Grid drag & drop de fotos |
| `src/app/admin/page.tsx` | Modificar | Añadir sección fotos con PhotoOrderAdmin |
| `src/test/api/photos-order.test.ts` | Crear | Tests del endpoint de orden |

---

## Task 1: Actualizar texto norma #03

**Files:**
- Modify: `src/app/normas/page.tsx`

- [ ] **Step 1: Editar el campo `body` de la norma `'03'`**

En `src/app/normas/page.tsx`, localizar el objeto con `num: '03'` y sustituir su `body`:

```tsx
{
  num: '03',
  title: 'Pago por transferencia',
  body: 'El precio es de 30 €/noche. El pago se realiza mediante transferencia bancaria. El IBAN es ES32 2100 3922 8401 0044 1553.',
},
```

- [ ] **Step 2: Verificar compilación**

```bash
npm run build 2>&1 | tail -5
```
Expected: sin errores de compilación.

- [ ] **Step 3: Commit**

```bash
git add src/app/normas/page.tsx
git commit -m "content: actualizar IBAN en norma 03 de pago por transferencia"
```

---

## Task 2: Normas y Fotos privadas

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Añadir `/normas` al middleware**

En `src/middleware.ts`, actualizar `isPrivateRoute`:

```ts
const isPrivateRoute = createRouteMatcher([
  '/calendario(.*)',
  '/reservas(.*)',
  '/normas(.*)',
  '/fotos(.*)',
  '/admin(.*)',
])
```

- [ ] **Step 2: Mover normas y fotos a NAV_PRIVATE en el Header**

En `src/components/Header.tsx`, cambiar las constantes de navegación:

```tsx
const NAV_PUBLIC: { href: string; label: string }[] = []

const NAV_PRIVATE = [
  { href: '/calendario', label: 'Calendario'   },
  { href: '/reservas',   label: 'Mis reservas' },
  { href: '/normas',     label: 'Normas'       },
  { href: '/fotos',      label: 'Fotos'        },
]
```

- [ ] **Step 3: Verificar compilación**

```bash
npm run build 2>&1 | tail -5
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/components/Header.tsx
git commit -m "feat: normas y fotos pasan a ser rutas privadas"
```

---

## Task 3: Admin link para múltiples admins

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/app/layout.tsx`

### Contexto

`Header.tsx` comprueba `user?.publicMetadata?.role === 'admin'` (Clerk). Los usuarios añadidos como admin directamente en Supabase no tienen esa metadata en Clerk, así que el enlace Admin no aparece. La solución: `layout.tsx` (server component) consulta Supabase y pasa `isAdmin` como prop al Header.

- [ ] **Step 1: Añadir prop `isAdmin` a Header**

En `src/components/Header.tsx`, cambiar la firma del componente y el cálculo de admin:

```tsx
export function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const { isSignedIn } = useUser()

  const allLinks = isSignedIn
    ? [...(isAdmin ? NAV_ADMIN : []), ...NAV_PRIVATE]
    : NAV_PUBLIC

  // ... resto igual
```

Eliminar la línea:
```tsx
const { isSignedIn, user } = useUser()
const isAdmin = user?.publicMetadata?.role === 'admin'
```

Reemplazarla por:
```tsx
const { isSignedIn } = useUser()
```

- [ ] **Step 2: Pasar `isAdmin` desde `layout.tsx`**

En `src/app/layout.tsx`, añadir imports y lógica de detección de admin:

```tsx
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { ClerkProvider, auth } from '@clerk/nextjs'
import { Header } from '@/components/Header'
import { getSupabaseUser } from '@/lib/getUser'
import './globals.css'

// ... (fuentes igual que antes)

export const metadata: Metadata = {
  title: {
    default: 'Casa Cervantes — Santoña',
    template: '%s — Casa Cervantes',
  },
  description: 'Gestión de reservas de la casa familiar en Calle Cervantes, Santoña, Cantabria.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  let isAdmin = false
  if (userId) {
    const dbUser = await getSupabaseUser(userId)
    isAdmin = dbUser?.role === 'admin'
  }

  return (
    <ClerkProvider>
      <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
        <body className="font-sans bg-stone min-h-screen">
          <Header isAdmin={isAdmin} />
          <main className="pt-16">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 3: Verificar compilación**

```bash
npm run build 2>&1 | tail -10
```
Expected: sin errores de tipo.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx src/app/layout.tsx
git commit -m "fix: detectar rol admin desde Supabase para mostrar enlace Admin"
```

---

## Task 4: Menú hamburguesa (móvil)

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Añadir estado y cierre automático**

Al inicio de `Header`, añadir:

```tsx
const [menuOpen, setMenuOpen] = useState(false)

useEffect(() => {
  setMenuOpen(false)
}, [pathname])
```

Asegurarse de que `useState` y `useEffect` están importados de `'react'`.

- [ ] **Step 2: Añadir botón hamburguesa**

Dentro del `<header>`, después del bloque `{/* Auth */}`, añadir el botón hamburguesa visible solo en móvil:

```tsx
{/* Hamburguesa (solo móvil, solo si hay links) */}
{isSignedIn && (
<button
  className="md:hidden ml-3 flex flex-col gap-1.5 p-1"
  onClick={() => setMenuOpen(o => !o)}
  aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
>
  {menuOpen ? (
    // Icono ✕
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    // Icono ☰
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )}
</button>
)}
```

- [ ] **Step 3: Añadir el menú desplegable móvil**

Justo antes del cierre `</header>`, añadir el panel móvil:

```tsx
{/* Menú móvil desplegable */}
{menuOpen && (
  <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-border shadow-md z-40">
    <nav className="flex flex-col px-6 py-4 gap-1">
      {allLinks.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm py-2.5 border-b border-border/50 last:border-0 transition-colors duration-150 ${
              isActive
                ? 'text-navy font-medium'
                : 'text-muted hover:text-navy'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  </div>
)}
```

El `<header>` padre debe tener `relative` en su className para que el menú se posicione correctamente. El header ya tiene `fixed top-0 left-0 right-0 z-50`, añadir `relative` no es necesario porque con `fixed` los children con `absolute` se posicionan relativos a él en la pila de stacking context. Verificar que el menú aparece correctamente al probar.

- [ ] **Step 4: Verificar compilación**

```bash
npm run build 2>&1 | tail -5
```
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: menú hamburguesa para navegación en móvil"
```

---

## Task 5: Seed de fotos en Supabase

**Files:**
- Create: `supabase/migrations/005_photos_seed.sql`

- [ ] **Step 1: Crear el fichero de seed**

Crear `supabase/migrations/005_photos_seed.sql`:

```sql
-- ============================================================
-- MIGRACIÓN 005: Seed inicial de fotos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

INSERT INTO photos (storage_path, url, sort_order) VALUES
  ('images/WhatsApp Image 2026-04-12 at 21.37.07 (1).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.07 (1).jpeg', 1),
  ('images/WhatsApp Image 2026-04-12 at 21.37.07.jpeg',     '/images/WhatsApp Image 2026-04-12 at 21.37.07.jpeg',     2),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (1).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (1).jpeg', 3),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (2).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (2).jpeg', 4),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (3).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (3).jpeg', 5),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (4).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (4).jpeg', 6),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (5).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (5).jpeg', 7),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (6).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (6).jpeg', 8),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (7).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (7).jpeg', 9),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (8).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (8).jpeg', 10),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08 (9).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.08 (9).jpeg', 11),
  ('images/WhatsApp Image 2026-04-12 at 21.37.08.jpeg',     '/images/WhatsApp Image 2026-04-12 at 21.37.08.jpeg',     12),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (1).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (1).jpeg', 13),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (2).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (2).jpeg', 14),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (3).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (3).jpeg', 15),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (4).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (4).jpeg', 16),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (5).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (5).jpeg', 17),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (6).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (6).jpeg', 18),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09 (7).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.09 (7).jpeg', 19),
  ('images/WhatsApp Image 2026-04-12 at 21.37.09.jpeg',     '/images/WhatsApp Image 2026-04-12 at 21.37.09.jpeg',     20),
  ('images/WhatsApp Image 2026-04-12 at 21.37.10 (1).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.10 (1).jpeg', 21),
  ('images/WhatsApp Image 2026-04-12 at 21.37.10 (2).jpeg', '/images/WhatsApp Image 2026-04-12 at 21.37.10 (2).jpeg', 22),
  ('images/WhatsApp Image 2026-04-12 at 21.37.10.jpeg',     '/images/WhatsApp Image 2026-04-12 at 21.37.10.jpeg',     23),
  ('images/WhatsApp Image 2026-04-13 at 01.03.14.jpeg',     '/images/WhatsApp Image 2026-04-13 at 01.03.14.jpeg',     24)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Ejecutar el seed en Supabase**

Abrir Supabase Dashboard → SQL Editor → pegar el contenido de `005_photos_seed.sql` → Run.

Verificar con:
```sql
SELECT id, sort_order, url FROM photos ORDER BY sort_order;
```
Expected: 24 filas con `sort_order` 1–24.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_photos_seed.sql
git commit -m "feat: seed de 24 fotos en tabla photos con sort_order inicial"
```

---

## Task 6: Página de fotos lee de Supabase

**Files:**
- Modify: `src/app/fotos/page.tsx`

- [ ] **Step 1: Reemplazar array hardcodeado por consulta Supabase**

Reemplazar todo el contenido de `src/app/fotos/page.tsx`:

```tsx
// src/app/fotos/page.tsx
import type { Metadata } from 'next'
import { PhotoSlider } from '@/components/PhotoSlider'
import { createAdminClient } from '@/lib/supabase'
import type { Photo } from '@/types'

export const metadata: Metadata = { title: 'Fotos' }

export default async function FotosPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('photos')
    .select('id, url, sort_order')
    .order('sort_order')

  const photos = ((data ?? []) as Pick<Photo, 'id' | 'url' | 'sort_order'>[])
    .map(p => p.url)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-navy">Fotos</h1>
        <p className="text-muted text-sm mt-1">Casa Cervantes · Santoña</p>
      </div>
      <PhotoSlider photos={photos} />
    </div>
  )
}
```

- [ ] **Step 2: Verificar compilación**

```bash
npm run build 2>&1 | tail -5
```
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/fotos/page.tsx
git commit -m "feat: página fotos lee orden desde tabla photos en Supabase"
```

---

## Task 7: API endpoint para guardar orden de fotos

**Files:**
- Create: `src/app/api/photos/order/route.ts`
- Create: `src/test/api/photos-order.test.ts`

### Contexto de seguridad

El endpoint recibe `{ order: [{id: string, sort_order: number}[]] }`, verifica que el usuario tiene `role = 'admin'` en Supabase usando `auth()` + `getSupabaseUser()`, y actualiza cada fila. Usa `createAdminClient()` (service_role) para hacer los updates.

- [ ] **Step 1: Crear el test primero**

Crear `src/test/api/photos-order.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

// Función pura de validación extraída de la lógica del route
function validateOrderPayload(body: unknown): { order: { id: string; sort_order: number }[] } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.order)) return null
  for (const item of b.order) {
    if (typeof (item as Record<string, unknown>).id !== 'string') return null
    if (typeof (item as Record<string, unknown>).sort_order !== 'number') return null
    if (!Number.isInteger((item as Record<string, unknown>).sort_order)) return null
    if ((item as Record<string, unknown>).sort_order < 0) return null
  }
  return b as { order: { id: string; sort_order: number }[] }
}

describe('validateOrderPayload', () => {
  it('acepta payload válido', () => {
    const result = validateOrderPayload({
      order: [
        { id: 'abc-123', sort_order: 1 },
        { id: 'def-456', sort_order: 2 },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.order).toHaveLength(2)
  })

  it('rechaza payload sin order', () => {
    expect(validateOrderPayload({})).toBeNull()
  })

  it('rechaza payload con order que no es array', () => {
    expect(validateOrderPayload({ order: 'string' })).toBeNull()
  })

  it('rechaza item sin id', () => {
    expect(validateOrderPayload({ order: [{ sort_order: 1 }] })).toBeNull()
  })

  it('rechaza item con sort_order negativo', () => {
    expect(validateOrderPayload({ order: [{ id: 'x', sort_order: -1 }] })).toBeNull()
  })

  it('rechaza item con sort_order decimal', () => {
    expect(validateOrderPayload({ order: [{ id: 'x', sort_order: 1.5 }] })).toBeNull()
  })

  it('acepta lista vacía', () => {
    const result = validateOrderPayload({ order: [] })
    expect(result).not.toBeNull()
    expect(result!.order).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que pasan (función aún no existe)**

```bash
npm run test:run -- src/test/api/photos-order.test.ts
```
Expected: FAIL — `validateOrderPayload is not defined`.

- [ ] **Step 3: Crear el API route**

Crear `src/app/api/photos/order/route.ts`:

```ts
// src/app/api/photos/order/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { getSupabaseUser } from '@/lib/getUser'

export function validateOrderPayload(
  body: unknown
): { order: { id: string; sort_order: number }[] } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.order)) return null
  for (const item of b.order) {
    if (typeof (item as Record<string, unknown>).id !== 'string') return null
    if (typeof (item as Record<string, unknown>).sort_order !== 'number') return null
    if (!Number.isInteger((item as Record<string, unknown>).sort_order)) return null
    if ((item as Record<string, unknown>).sort_order < 0) return null
  }
  return b as { order: { id: string; sort_order: number }[] }
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const dbUser = await getSupabaseUser(userId)
  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const payload = validateOrderPayload(body)
  if (!payload) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()
  for (const { id, sort_order } of payload.order) {
    const { error } = await supabase
      .from('photos')
      .update({ sort_order })
      .eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Error al actualizar foto ' + id }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Actualizar el test para importar desde el route**

Editar `src/test/api/photos-order.test.ts` — reemplazar la definición local de `validateOrderPayload` por un import:

```ts
import { describe, it, expect } from 'vitest'
import { validateOrderPayload } from '@/app/api/photos/order/route'

describe('validateOrderPayload', () => {
  it('acepta payload válido', () => {
    const result = validateOrderPayload({
      order: [
        { id: 'abc-123', sort_order: 1 },
        { id: 'def-456', sort_order: 2 },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.order).toHaveLength(2)
  })

  it('rechaza payload sin order', () => {
    expect(validateOrderPayload({})).toBeNull()
  })

  it('rechaza payload con order que no es array', () => {
    expect(validateOrderPayload({ order: 'string' })).toBeNull()
  })

  it('rechaza item sin id', () => {
    expect(validateOrderPayload({ order: [{ sort_order: 1 }] })).toBeNull()
  })

  it('rechaza item con sort_order negativo', () => {
    expect(validateOrderPayload({ order: [{ id: 'x', sort_order: -1 }] })).toBeNull()
  })

  it('rechaza item con sort_order decimal', () => {
    expect(validateOrderPayload({ order: [{ id: 'x', sort_order: 1.5 }] })).toBeNull()
  })

  it('acepta lista vacía', () => {
    const result = validateOrderPayload({ order: [] })
    expect(result).not.toBeNull()
    expect(result!.order).toHaveLength(0)
  })
})
```

- [ ] **Step 5: Ejecutar tests**

```bash
npm run test:run -- src/test/api/photos-order.test.ts
```
Expected: 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/photos/order/route.ts src/test/api/photos-order.test.ts
git commit -m "feat: endpoint PATCH /api/photos/order para guardar orden de fotos"
```

---

## Task 8: Componente PhotoOrderAdmin (drag & drop)

**Files:**
- Create: `src/components/PhotoOrderAdmin.tsx`

### Setup de dependencias

- [ ] **Step 1: Instalar dnd-kit**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
Expected: sin errores, `package.json` actualizado con las 3 dependencias.

- [ ] **Step 2: Crear el componente**

Crear `src/components/PhotoOrderAdmin.tsx`:

```tsx
// src/components/PhotoOrderAdmin.tsx
'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Photo } from '@/types'

interface PhotoOrderAdminProps {
  photos: Pick<Photo, 'id' | 'url' | 'sort_order'>[]
}

interface SortablePhotoProps {
  photo: Pick<Photo, 'id' | 'url'>
  index: number
}

function SortablePhoto({ photo, index }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing ring-1 ring-border hover:ring-navy/40 transition-shadow"
    >
      <Image
        src={photo.url}
        alt={`Foto ${index + 1}`}
        fill
        className="object-cover pointer-events-none"
        sizes="120px"
      />
      <div className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-tl-md select-none">
        {index + 1}
      </div>
    </div>
  )
}

export function PhotoOrderAdmin({ photos: initialPhotos }: PhotoOrderAdminProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setPhotos(prev => {
      const oldIndex = prev.findIndex(p => p.id === active.id)
      const newIndex = prev.findIndex(p => p.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
    setDirty(true)
    setSaved(false)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const order = photos.map((p, i) => ({ id: p.id, sort_order: i + 1 }))
    const res = await fetch('/api/photos/order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    })
    setSaving(false)
    if (res.ok) {
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }, [photos])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Arrastra las fotos para cambiar el orden. El cambio se guarda al pulsar el botón.
        </p>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">Guardado</span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="bg-navy text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar orden'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={photos.map(p => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {photos.map((photo, index) => (
              <SortablePhoto key={photo.id} photo={photo} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
```

- [ ] **Step 3: Verificar compilación**

```bash
npm run build 2>&1 | tail -10
```
Expected: sin errores de tipo.

- [ ] **Step 4: Commit**

```bash
git add src/components/PhotoOrderAdmin.tsx package.json package-lock.json
git commit -m "feat: componente PhotoOrderAdmin con drag & drop para reordenar fotos"
```

---

## Task 9: Sección fotos en panel admin

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Importar tipos y cliente Supabase adicionales**

Al principio de `src/app/admin/page.tsx`, añadir al bloque de imports existente:

```tsx
import { PhotoOrderAdmin } from '@/components/PhotoOrderAdmin'
import type { Photo } from '@/types'
```

(El import de `createAdminClient` ya existe, no duplicar.)

- [ ] **Step 2: Añadir consulta de fotos al Promise.all**

En la llamada a `Promise.all`, añadir la consulta de fotos como cuarto elemento:

```tsx
const [
  { data: reservationsRaw },
  { data: augustAssignment },
  { data: familiesRaw },
  { data: photosRaw },
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
  supabase
    .from('families')
    .select('id, name, created_at')
    .order('name'),
  supabase
    .from('photos')
    .select('id, url, sort_order')
    .order('sort_order'),
])
```

- [ ] **Step 3: Extraer variable photos**

Justo debajo de donde se definen `reservations` y `families`:

```tsx
const photos = (photosRaw ?? []) as unknown as Pick<Photo, 'id' | 'url' | 'sort_order'>[]
```

- [ ] **Step 4: Añadir la sección en el JSX**

Al final del JSX de `AdminPage`, antes del cierre del `<div>` principal, añadir:

```tsx
{/* Ordenación de fotos */}
<div>
  <h2 className="font-display text-xl font-semibold text-navy mb-4">Fotos</h2>
  <div className="bg-white border border-border rounded-xl p-6 shadow-card">
    <PhotoOrderAdmin photos={photos} />
  </div>
</div>
```

- [ ] **Step 5: Verificar compilación y tests**

```bash
npm run build 2>&1 | tail -5
npm run test:run
```
Expected: build sin errores, tests todos en verde.

- [ ] **Step 6: Commit final**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: sección de ordenación de fotos en panel admin"
```

---

## Verificación final

- [ ] Ejecutar `npm run build` — sin errores ni warnings de tipo.
- [ ] Ejecutar `npm run test:run` — todos los tests pasan.
- [ ] Comprobar visualmente en `npm run dev`:
  - En móvil (< 768px): aparece botón hamburguesa; el menú se despliega con todos los enlaces.
  - Usuario no autenticado: no ve Normas ni Fotos en el menú; si navega a `/normas` o `/fotos` es redirigido a `/sign-in`.
  - Segundo admin (con role en Supabase): ve el enlace Admin en el menú.
  - `/normas` → norma 03 muestra el IBAN correcto.
  - `/fotos` → muestra las 24 fotos en el orden de `sort_order`.
  - `/admin` → sección Fotos al final; se puede arrastrar y guardar el orden; recargar `/fotos` refleja el nuevo orden.
