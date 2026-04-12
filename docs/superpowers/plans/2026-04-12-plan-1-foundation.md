# Casa Cervantes — Plan 1: Fundación y Autenticación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffoldear el proyecto Next.js, configurar el sistema de diseño completo, crear el schema de Supabase con todas las tablas/RLS/RPCs/seed, integrar Clerk, sincronizar usuarios vía webhook, y entregar las páginas públicas (landing, normas, sign-in) con el shell autenticado.

**Architecture:** Next.js 14 App Router con patrón híbrido SSR/Client. Todas las operaciones de Supabase se ejecutan server-side usando la service_role key. Clerk gestiona auth; un webhook sincroniza nuevos usuarios con la tabla `users`. Los Client Components gestionan la UI interactiva.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS v3, @clerk/nextjs v5, @supabase/supabase-js v2, svix (verificación de firma del webhook), Vitest (tests)

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/types/index.ts` | Todos los interfaces TypeScript (Family, User, Reservation, etc.) |
| `src/lib/supabase.ts` | Fábrica de clientes Supabase (admin + anon) |
| `src/lib/utils.ts` | Funciones puras compartidas (formatDate, calcNights, isAugust…) |
| `middleware.ts` | Protección de rutas con Clerk |
| `src/app/layout.tsx` | Root layout con ClerkProvider + fuentes |
| `src/app/globals.css` | Variables CSS + estilos globales + clases utilitarias |
| `tailwind.config.ts` | Colores, fuentes y sombras personalizadas |
| `src/components/Header.tsx` | Header fijo (logo + nav + auth) |
| `src/app/page.tsx` | Landing page (hero + stats bar + descripción) |
| `src/app/normas/page.tsx` | Página de normas |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Página sign-in de Clerk |
| `src/app/api/webhooks/clerk/route.ts` | Webhook Clerk → sync usuario en Supabase |
| `supabase/migrations/001_schema.sql` | Tablas: families, users, reservations, audit_log, photos, august_assignments + vista accounting_summary + índices |
| `supabase/migrations/002_rls.sql` | RLS + funciones helper (get_current_app_user_id, is_admin) |
| `supabase/migrations/003_rpc.sql` | create_reservation, cancel_reservation, get_family_quota |
| `supabase/migrations/004_seed.sql` | 7 familias + 21 miembros reales |
| `vitest.config.ts` | Configuración de Vitest |
| `src/test/setup.ts` | Setup global de tests |
| `src/test/lib/utils.test.ts` | Tests de funciones utilitarias |

---

## Task 1: Scaffold Next.js + dependencias

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.local`, `vitest.config.ts`, `src/test/setup.ts`

- [ ] **Inicializar Next.js 14 en el directorio del proyecto**

```bash
cd "C:/Users/Adrian/OneDrive/Escritorio/Claude Code Projects/Web_Santoña"
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Cuando pregunte (si es interactivo), responder:
- Would you like to use TypeScript? → Yes
- Would you like to use ESLint? → Yes
- Would you like to use Tailwind CSS? → Yes
- Would you like your code inside a `src/` directory? → Yes
- Would you like to use App Router? → Yes
- Would you like to use Turbopack? → No
- What import alias would you like configured? → `@/*`

- [ ] **Instalar dependencias de producción**

```bash
npm install @clerk/nextjs @supabase/supabase-js svix framer-motion
```

- [ ] **Instalar dependencias de desarrollo**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Crear `.env.local`**

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (se usa en Plan 3)
RESEND_API_KEY=

# App
NEXT_PUBLIC_PRICE_PER_NIGHT=30
```

- [ ] **Verificar que `.env.local` está en `.gitignore`** (create-next-app lo añade por defecto)

```bash
grep "\.env\.local" .gitignore
```

Resultado esperado: `.env.local` aparece en el archivo.

- [ ] **Crear `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Crear `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Añadir script de tests a `package.json`** (añadir dentro de `"scripts"`)

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Inicializar git y primer commit**

```bash
git init
git add .
git commit -m "feat: inicializar proyecto Next.js 14 con TypeScript, Tailwind y dependencias"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Crear `src/types/index.ts`**

```typescript
export type UserRole = 'admin' | 'user'
export type ReservationStatus = 'active' | 'cancelled'
export type AuditAction =
  | 'reservation_created'
  | 'reservation_cancelled'
  | 'reservation_modified'

export interface Family {
  id: string
  name: string
  created_at: string
}

export interface User {
  id: string
  clerk_user_id: string | null
  email: string
  first_name: string
  last_name: string
  family_id: string | null
  family?: Family
  role: UserRole
  receive_notifications: boolean
  created_at: string
  updated_at: string
}

export interface AugustAssignment {
  id: string
  year: number
  family_id: string
  family?: Family
  assigned_by: string | null
  created_at: string
}

export interface Reservation {
  id: string
  user_id: string
  user?: User
  check_in: string   // 'YYYY-MM-DD'
  check_out: string  // 'YYYY-MM-DD'
  nights: number
  total_price: number
  status: ReservationStatus
  created_at: string
  updated_at: string
  cancelled_at: string | null
}

export interface AuditLogEntry {
  id: string
  user_id: string | null
  user?: User
  action: AuditAction
  reservation_id: string | null
  reservation?: Reservation
  details: Record<string, unknown>
  created_at: string
}

export interface Photo {
  id: string
  storage_path: string
  url: string
  caption: string | null
  sort_order: number
  uploaded_by: string | null
  created_at: string
}

export interface AccountingSummary {
  family_id: string
  family_name: string
  year: number
  month: number
  total_reservations: number
  total_nights: number
  total_income: number
}

// API request/response types
export interface ApiError {
  error: string
  code?: string
}

export interface CreateReservationRequest {
  check_in: string  // 'YYYY-MM-DD'
  check_out: string // 'YYYY-MM-DD'
}

export interface CreateReservationResponse {
  id: string
  check_in: string
  check_out: string
  nights: number
  total_price: number
}
```

- [ ] **Commit**

```bash
git add src/types/index.ts
git commit -m "feat: añadir tipos TypeScript para toda la aplicación"
```

---

## Task 3: Sistema de diseño — Tailwind + CSS vars + fuentes

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Reemplazar `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:          '#1D3557',
        'navy-dark':   '#162840',
        blue:          '#4A7C9E',
        'blue-light':  '#A8C8E0',
        gold:          '#C4943A',
        'gold-dark':   '#A87A2A',
        stone:         '#F7F5F2',
        border:        '#E5E0D8',
        muted:         '#6A7A88',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:    ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 4px 24px rgba(29, 53, 87, 0.08)',
        'card-hover': '0 8px 32px rgba(29, 53, 87, 0.14)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Reemplazar `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    background-color: #F7F5F2;
    color: #2C3440;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@layer components {
  .btn-primary {
    @apply bg-gold hover:bg-gold-dark text-white font-semibold px-7 py-3 rounded-lg
           transition-colors duration-150 text-sm tracking-wide inline-block;
  }

  .btn-secondary {
    @apply bg-stone hover:bg-border text-navy font-medium px-7 py-3 rounded-lg
           border border-border transition-colors duration-150 text-sm tracking-wide inline-block;
  }

  .btn-danger {
    @apply bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5
           rounded-lg transition-colors duration-150 text-sm;
  }

  .card {
    @apply bg-white rounded-xl shadow-card border border-border p-6;
  }

  .page-container {
    @apply max-w-7xl mx-auto px-8 md:px-12 py-10;
  }

  .section-title {
    @apply font-display text-3xl text-navy font-bold;
  }

  .section-subtitle {
    @apply text-muted text-sm mt-1.5 leading-relaxed;
  }
}
```

- [ ] **Reemplazar `src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Casa Cervantes — Santoña',
    template: '%s — Casa Cervantes',
  },
  description: 'Gestión de reservas de la casa familiar en Calle Cervantes, Santoña, Cantabria.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
        <body className="font-sans bg-stone min-h-screen">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Verificar que el servidor arranca**

```bash
npm run dev
```

Abrir http://localhost:3000 — debe cargar sin errores de consola (ignorar warnings de Clerk sobre claves vacías).

- [ ] **Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat: configurar sistema de diseño Tailwind con paleta Cantábrico y tipografía"
```

---

## Task 4: Clientes Supabase y utilidades

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/utils.ts`
- Create: `src/test/lib/utils.test.ts`

- [ ] **Crear `src/lib/supabase.ts`**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Cliente admin con service_role key.
 * Bypasa RLS — usar exclusivamente en Server Components y API Routes.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })
}

/**
 * Cliente anon — respeta RLS.
 * Para lecturas públicas desde Server Components cuando no se necesitan privilegios.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  })
}
```

- [ ] **Crear `src/lib/utils.ts`**

```typescript
/**
 * Formatea 'YYYY-MM-DD' como '15 jul 2026'
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Formatea 'YYYY-MM-DD' como '15 de julio de 2026' (formato largo)
 */
export function formatDateLong(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Calcula noches entre check_in y check_out ('YYYY-MM-DD')
 */
export function calcNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Calcula precio total: noches × 30 €
 */
export function calcPrice(nights: number): number {
  return nights * Number(process.env.NEXT_PUBLIC_PRICE_PER_NIGHT ?? 30)
}

/**
 * Formatea precio: 210 → '210 €'
 */
export function formatPrice(amount: number): string {
  return `${amount} €`
}

/**
 * Devuelve true si una fecha ISO cae en agosto
 */
export function isAugust(isoDate: string): boolean {
  return new Date(isoDate + 'T00:00:00').getMonth() === 7 // getMonth() es 0-indexed
}

/**
 * Nombre del mes en español (1-indexed)
 */
export function monthName(month: number): string {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return names[month - 1] ?? ''
}

/**
 * Nombre abreviado del mes (ene, feb…)
 */
export function monthNameShort(month: number): string {
  return monthName(month).substring(0, 3).toLowerCase()
}

/**
 * Genera un array de objetos {date: 'YYYY-MM-DD', dayOfMonth: number}
 * para todos los días de un mes dado.
 */
export function getDaysInMonth(year: number, month: number): Array<{ date: string; dayOfMonth: number }> {
  const days: Array<{ date: string; dayOfMonth: number }> = []
  const daysInMonth = new Date(year, month, 0).getDate() // month es 1-indexed aquí
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({ date: `${year}-${mm}-${dd}`, dayOfMonth: d })
  }
  return days
}

/**
 * Día de la semana de inicio del mes (0=Dom, 1=Lun…) ajustado a lunes primero
 * Devuelve 0 para Lunes, 6 para Domingo
 */
export function getMonthStartDayOffset(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Dom
  return firstDay === 0 ? 6 : firstDay - 1 // Convertir a lunes=0
}

/**
 * Comprueba si una fecha ISO está dentro de un rango [checkIn, checkOut)
 */
export function isDateInRange(date: string, checkIn: string, checkOut: string): boolean {
  return date >= checkIn && date < checkOut
}

/**
 * Devuelve 'YYYY-MM-DD' de hoy
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
```

- [ ] **Escribir tests para utils** — crear `src/test/lib/utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  calcNights,
  calcPrice,
  isAugust,
  formatPrice,
  monthName,
  monthNameShort,
  getDaysInMonth,
  getMonthStartDayOffset,
  isDateInRange,
} from '@/lib/utils'

describe('calcNights', () => {
  it('calcula 7 noches correctamente', () => {
    expect(calcNights('2026-07-18', '2026-07-25')).toBe(7)
  })
  it('calcula 1 noche', () => {
    expect(calcNights('2026-07-01', '2026-07-02')).toBe(1)
  })
  it('calcula 15 noches (máximo permitido)', () => {
    expect(calcNights('2026-07-01', '2026-07-16')).toBe(15)
  })
})

describe('calcPrice', () => {
  it('calcula 7 noches × 30 = 210', () => {
    expect(calcPrice(7)).toBe(210)
  })
  it('calcula 15 noches × 30 = 450', () => {
    expect(calcPrice(15)).toBe(450)
  })
})

describe('isAugust', () => {
  it('detecta 15 de agosto como agosto', () => {
    expect(isAugust('2026-08-15')).toBe(true)
  })
  it('detecta 1 de agosto como agosto', () => {
    expect(isAugust('2026-08-01')).toBe(true)
  })
  it('rechaza 31 de julio', () => {
    expect(isAugust('2026-07-31')).toBe(false)
  })
  it('rechaza septiembre', () => {
    expect(isAugust('2026-09-01')).toBe(false)
  })
})

describe('formatPrice', () => {
  it('formatea 210 como "210 €"', () => {
    expect(formatPrice(210)).toBe('210 €')
  })
  it('formatea 0 como "0 €"', () => {
    expect(formatPrice(0)).toBe('0 €')
  })
})

describe('monthName', () => {
  it('devuelve Enero para el mes 1', () => {
    expect(monthName(1)).toBe('Enero')
  })
  it('devuelve Agosto para el mes 8', () => {
    expect(monthName(8)).toBe('Agosto')
  })
  it('devuelve Diciembre para el mes 12', () => {
    expect(monthName(12)).toBe('Diciembre')
  })
})

describe('monthNameShort', () => {
  it('devuelve "ago" para mes 8', () => {
    expect(monthNameShort(8)).toBe('ago')
  })
  it('devuelve "ene" para mes 1', () => {
    expect(monthNameShort(1)).toBe('ene')
  })
})

describe('getDaysInMonth', () => {
  it('julio 2026 tiene 31 días', () => {
    const days = getDaysInMonth(2026, 7)
    expect(days).toHaveLength(31)
    expect(days[0].date).toBe('2026-07-01')
    expect(days[30].date).toBe('2026-07-31')
  })
  it('febrero 2026 tiene 28 días (no bisiesto)', () => {
    const days = getDaysInMonth(2026, 2)
    expect(days).toHaveLength(28)
  })
  it('febrero 2024 tiene 29 días (bisiesto)', () => {
    const days = getDaysInMonth(2024, 2)
    expect(days).toHaveLength(29)
  })
})

describe('getMonthStartDayOffset', () => {
  it('julio 2026 empieza en miércoles (offset 2)', () => {
    // 1 julio 2026 = miércoles → offset 2 (lunes=0, martes=1, miércoles=2)
    expect(getMonthStartDayOffset(2026, 7)).toBe(2)
  })
})

describe('isDateInRange', () => {
  it('fecha dentro del rango', () => {
    expect(isDateInRange('2026-07-20', '2026-07-18', '2026-07-25')).toBe(true)
  })
  it('fecha igual a check_in está incluida', () => {
    expect(isDateInRange('2026-07-18', '2026-07-18', '2026-07-25')).toBe(true)
  })
  it('fecha igual a check_out NO está incluida (es día de salida)', () => {
    expect(isDateInRange('2026-07-25', '2026-07-18', '2026-07-25')).toBe(false)
  })
  it('fecha fuera del rango', () => {
    expect(isDateInRange('2026-07-26', '2026-07-18', '2026-07-25')).toBe(false)
  })
})
```

- [ ] **Ejecutar tests**

```bash
npm run test:run
```

Resultado esperado: `✓ 20 tests passing`.

- [ ] **Commit**

```bash
git add src/lib/ src/test/
git commit -m "feat: añadir clientes Supabase, utilidades y tests (20 passing)"
```

---

## Task 5: Clerk — Middleware y configuración

**Files:**
- Create: `middleware.ts`

- [ ] **Crear `middleware.ts` en la raíz del proyecto**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/normas',
  '/sign-in(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next()
  await auth.protect()
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

- [ ] **Verificar que el middleware funciona** — con el servidor en marcha:

```bash
npm run dev
```

Abrir http://localhost:3000/calendario en el navegador. Debe redirigir a `/sign-in`. ✓
Abrir http://localhost:3000/normas — debe cargar sin redirigir. ✓

- [ ] **Commit**

```bash
git add middleware.ts
git commit -m "feat: configurar middleware Clerk para protección de rutas privadas"
```

---

## Task 6: Migración SQL — Schema

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Crear `supabase/migrations/001_schema.sql`**

```sql
-- ============================================================
-- MIGRACIÓN 001: Schema completo Casa Cervantes
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- families
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS families (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id         TEXT UNIQUE,          -- NULL hasta primer login
  email                 TEXT NOT NULL DEFAULT '',
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  family_id             UUID REFERENCES families(id),  -- NULL hasta asignación
  role                  TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  receive_notifications BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- august_assignments
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS august_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year        INTEGER NOT NULL,
  family_id   UUID NOT NULL REFERENCES families(id),
  assigned_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year)
);

-- -------------------------------------------------------
-- reservations
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  nights      INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS ((check_out - check_in) * 30) STORED,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT valid_dates           CHECK (check_out > check_in),
  CONSTRAINT max_consecutive_nights CHECK ((check_out - check_in) <= 15)
);

-- -------------------------------------------------------
-- audit_log
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id),
  action         TEXT NOT NULL CHECK (action IN (
                   'reservation_created',
                   'reservation_cancelled',
                   'reservation_modified'
                 )),
  reservation_id UUID REFERENCES reservations(id),
  details        JSONB,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- photos
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  url          TEXT NOT NULL,
  caption      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  uploaded_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- Vista: accounting_summary
-- -------------------------------------------------------
CREATE OR REPLACE VIEW accounting_summary AS
SELECT
  f.id                                   AS family_id,
  f.name                                 AS family_name,
  EXTRACT(YEAR  FROM r.check_in)::INTEGER AS year,
  EXTRACT(MONTH FROM r.check_in)::INTEGER AS month,
  COUNT(r.id)                            AS total_reservations,
  SUM(r.nights)                          AS total_nights,
  SUM(r.total_price)                     AS total_income
FROM reservations r
JOIN users    u ON r.user_id    = u.id
JOIN families f ON u.family_id  = f.id
WHERE r.status = 'active'
GROUP BY f.id, f.name,
  EXTRACT(YEAR  FROM r.check_in),
  EXTRACT(MONTH FROM r.check_in)
ORDER BY year, month, f.name;

-- -------------------------------------------------------
-- Índices de rendimiento
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reservations_status      ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in    ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out   ON reservations(check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id     ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id      ON users(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_family_id          ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_reservation_id ON audit_log(reservation_id);
CREATE INDEX IF NOT EXISTS idx_photos_sort_order        ON photos(sort_order);
```

- [ ] **Ejecutar en Supabase**

1. Abrir https://supabase.com → tu proyecto → **SQL Editor → New query**
2. Pegar el contenido de `supabase/migrations/001_schema.sql`
3. Ejecutar (▶ Run)
4. Verificar en **Table Editor** que aparecen: `families`, `users`, `august_assignments`, `reservations`, `audit_log`, `photos`

- [ ] **Commit**

```bash
git add supabase/
git commit -m "feat: migración 001 — schema completo con tablas, vista e índices"
```

---

## Task 7: Migración SQL — RLS

**Files:**
- Create: `supabase/migrations/002_rls.sql`

- [ ] **Crear `supabase/migrations/002_rls.sql`**

```sql
-- ============================================================
-- MIGRACIÓN 002: Row Level Security
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE families          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE august_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos            ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- Funciones helper
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_app_user_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT id FROM users WHERE clerk_user_id = (auth.jwt() ->> 'sub');
$$;

CREATE OR REPLACE FUNCTION get_current_app_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM users WHERE clerk_user_id = (auth.jwt() ->> 'sub');
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(get_current_app_user_role() = 'admin', false);
$$;

-- -------------------------------------------------------
-- Políticas: families (lectura pública)
-- -------------------------------------------------------
CREATE POLICY "families_select_all"
  ON families FOR SELECT USING (true);

-- -------------------------------------------------------
-- Políticas: users
-- -------------------------------------------------------
CREATE POLICY "users_select_own_or_admin"
  ON users FOR SELECT
  USING (clerk_user_id = (auth.jwt() ->> 'sub') OR is_admin());

-- -------------------------------------------------------
-- Políticas: august_assignments
-- -------------------------------------------------------
CREATE POLICY "august_select_all"
  ON august_assignments FOR SELECT USING (true);

CREATE POLICY "august_insert_admin"
  ON august_assignments FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "august_update_admin"
  ON august_assignments FOR UPDATE USING (is_admin());

-- -------------------------------------------------------
-- Políticas: reservations
-- -------------------------------------------------------
CREATE POLICY "reservations_select_authenticated"
  ON reservations FOR SELECT
  USING (auth.jwt() IS NOT NULL);

CREATE POLICY "reservations_insert_authenticated"
  ON reservations FOR INSERT
  WITH CHECK (auth.jwt() IS NOT NULL);

CREATE POLICY "reservations_update_own_or_admin"
  ON reservations FOR UPDATE
  USING (user_id = get_current_app_user_id() OR is_admin());

-- -------------------------------------------------------
-- Políticas: audit_log
-- -------------------------------------------------------
CREATE POLICY "audit_log_select_admin"
  ON audit_log FOR SELECT USING (is_admin());

CREATE POLICY "audit_log_insert_service"
  ON audit_log FOR INSERT WITH CHECK (true);  -- Solo via service_role desde RPC

-- -------------------------------------------------------
-- Políticas: photos
-- -------------------------------------------------------
CREATE POLICY "photos_select_all"
  ON photos FOR SELECT USING (true);

CREATE POLICY "photos_insert_admin"
  ON photos FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "photos_update_admin"
  ON photos FOR UPDATE USING (is_admin());

CREATE POLICY "photos_delete_admin"
  ON photos FOR DELETE USING (is_admin());
```

- [ ] **Ejecutar en Supabase SQL Editor**

Pegar y ejecutar `supabase/migrations/002_rls.sql`. Verificar en **Authentication → Policies** que cada tabla tiene sus políticas.

- [ ] **Commit**

```bash
git add supabase/migrations/002_rls.sql
git commit -m "feat: migración 002 — RLS y políticas de acceso por tabla"
```

---

## Task 8: Migración SQL — Funciones RPC

**Files:**
- Create: `supabase/migrations/003_rpc.sql`

- [ ] **Crear `supabase/migrations/003_rpc.sql`**

```sql
-- ============================================================
-- MIGRACIÓN 003: Funciones RPC
-- ============================================================

-- -------------------------------------------------------
-- create_reservation
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION create_reservation(
  p_user_id  UUID,
  p_check_in  DATE,
  p_check_out DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id   UUID;
  v_user_family_id   UUID;
  v_august_family_id UUID;
  v_current_year     INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_nights           INTEGER := p_check_out - p_check_in;
  v_family_nights    INTEGER;
BEGIN
  -- 1. Fecha de entrada no en el pasado
  IF p_check_in < CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de entrada no puede ser en el pasado';
  END IF;

  -- 2. Año natural
  IF EXTRACT(YEAR FROM p_check_in)::INTEGER != v_current_year
     OR EXTRACT(YEAR FROM p_check_out)::INTEGER != v_current_year THEN
    -- Excepción: check_out = 1 ene año siguiente con check_in = 31 dic
    IF NOT (p_check_out = make_date(v_current_year + 1, 1, 1)
            AND EXTRACT(YEAR FROM p_check_in)::INTEGER = v_current_year) THEN
      RAISE EXCEPTION 'Solo se puede reservar dentro del año natural actual';
    END IF;
  END IF;

  -- 3. Antelación máxima 4 meses
  IF p_check_in > CURRENT_DATE + INTERVAL '4 months' THEN
    RAISE EXCEPTION 'No se puede reservar con más de 4 meses de antelación';
  END IF;

  -- 4. Máximo 15 noches
  IF v_nights > 15 THEN
    RAISE EXCEPTION 'Máximo 15 noches consecutivas';
  END IF;

  -- 5. Sin solapamiento
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE status = 'active'
      AND check_in  < p_check_out
      AND check_out > p_check_in
  ) THEN
    RAISE EXCEPTION 'Las fechas seleccionadas ya están reservadas';
  END IF;

  -- 6. Cuota familiar (máx. 30 noches en ventana de 4 meses)
  SELECT family_id INTO v_user_family_id FROM users WHERE id = p_user_id;

  IF v_user_family_id IS NULL THEN
    RAISE EXCEPTION 'Tu usuario no tiene una familia asignada. Contacta con el administrador.';
  END IF;

  SELECT COALESCE(SUM(r.nights), 0)::INTEGER INTO v_family_nights
  FROM reservations r
  JOIN users u ON r.user_id = u.id
  WHERE u.family_id = v_user_family_id
    AND r.status    = 'active'
    AND r.check_in  < CURRENT_DATE + INTERVAL '4 months'
    AND r.check_out > CURRENT_DATE;

  IF v_family_nights + v_nights > 30 THEN
    RAISE EXCEPTION
      'Tu familia ya tiene % noches reservadas. El máximo es 30 noches en los próximos 4 meses. Solo puedes añadir % noches más.',
      v_family_nights, (30 - v_family_nights);
  END IF;

  -- 7. Restricción agosto
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

  -- 8. Insertar reserva
  INSERT INTO reservations (user_id, check_in, check_out)
  VALUES (p_user_id, p_check_in, p_check_out)
  RETURNING id INTO v_reservation_id;

  -- 9. Audit log
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

-- -------------------------------------------------------
-- cancel_reservation
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_user_id        UUID,
  p_reservation_id UUID,
  p_is_admin       BOOLEAN DEFAULT false
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  SELECT * INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada o ya cancelada';
  END IF;

  IF v_reservation.user_id != p_user_id AND NOT p_is_admin THEN
    RAISE EXCEPTION 'No tienes permiso para cancelar esta reserva';
  END IF;

  UPDATE reservations
  SET status       = 'cancelled',
      cancelled_at = now(),
      updated_at   = now()
  WHERE id = p_reservation_id;

  INSERT INTO audit_log (user_id, action, reservation_id, details)
  VALUES (
    p_user_id,
    'reservation_cancelled',
    p_reservation_id,
    jsonb_build_object(
      'check_in',          v_reservation.check_in,
      'check_out',         v_reservation.check_out,
      'cancelled_by_admin', p_is_admin
    )
  );

  RETURN true;
END;
$$;

-- -------------------------------------------------------
-- get_family_quota
-- Noches usadas por familia en la ventana de 4 meses
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_family_quota(p_family_id UUID)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(SUM(r.nights), 0)::INTEGER
  FROM reservations r
  JOIN users u ON r.user_id = u.id
  WHERE u.family_id = p_family_id
    AND r.status    = 'active'
    AND r.check_in  < CURRENT_DATE + INTERVAL '4 months'
    AND r.check_out > CURRENT_DATE;
$$;
```

- [ ] **Ejecutar en Supabase SQL Editor**

Pegar y ejecutar. Verificar en **Database → Functions** que aparecen `create_reservation`, `cancel_reservation` y `get_family_quota`.

- [ ] **Commit**

```bash
git add supabase/migrations/003_rpc.sql
git commit -m "feat: migración 003 — RPCs create_reservation, cancel_reservation, get_family_quota"
```

---

## Task 9: Migración SQL — Seed

**Files:**
- Create: `supabase/migrations/004_seed.sql`

- [ ] **Crear `supabase/migrations/004_seed.sql`**

```sql
-- ============================================================
-- MIGRACIÓN 004: Seed — 7 familias y 21 miembros reales
-- EJECUTAR UNA SOLA VEZ después de 001_schema.sql
-- Los clerk_user_id se rellenan al primer login de cada usuario.
-- Los emails @placeholder.local se actualizan cuando el admin
-- crea las cuentas en Clerk con los correos reales.
-- ============================================================

-- Familias
INSERT INTO families (id, name) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Familia Terina'),
  ('f1000000-0000-0000-0000-000000000002', 'Familia Rafa'),
  ('f1000000-0000-0000-0000-000000000003', 'Familia Amalia'),
  ('f1000000-0000-0000-0000-000000000004', 'Familia Ramón'),
  ('f1000000-0000-0000-0000-000000000005', 'Familia Carlos'),
  ('f1000000-0000-0000-0000-000000000006', 'Familia Luis'),
  ('f1000000-0000-0000-0000-000000000007', 'Familia Ignacio')
ON CONFLICT (id) DO NOTHING;

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

-- Familia Luis (Adrian es administrador)
INSERT INTO users (first_name, last_name, family_id, email, role) VALUES
  ('Ignacio', 'Luis',  'f1000000-0000-0000-0000-000000000006', 'ignacio.luis@placeholder.local', 'user'),
  ('Kike',    'Luis',  'f1000000-0000-0000-0000-000000000006', 'kike@placeholder.local',          'user'),
  ('Ramon',   'Luis',  'f1000000-0000-0000-0000-000000000006', 'ramountainbike@gmail.com',        'user'),
  ('Nano',    'Luis',  'f1000000-0000-0000-0000-000000000006', 'nano@placeholder.local',          'user'),
  ('Adrian',  'Gómez', 'f1000000-0000-0000-0000-000000000006', 'adrian.gomez.dejuan@gmail.com',  'admin');

-- Familia Ignacio
INSERT INTO users (first_name, last_name, family_id, email) VALUES
  ('Tate', 'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'tate@placeholder.local'),
  ('Viki', 'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'viki@placeholder.local'),
  ('Oje',  'Ignacio', 'f1000000-0000-0000-0000-000000000007', 'oje@placeholder.local');
```

- [ ] **Ejecutar en Supabase SQL Editor**

Pegar y ejecutar. Verificar en **Table Editor**:
- `families`: 7 filas ✓
- `users`: 21 filas — comprobar que Adrian aparece con `role = 'admin'` y Ramon con `ramountainbike@gmail.com` ✓

- [ ] **Commit**

```bash
git add supabase/migrations/004_seed.sql
git commit -m "feat: migración 004 — seed con 7 familias y 21 miembros reales"
```

---

## Task 10: Webhook Clerk → Supabase

**Files:**
- Create: `src/app/api/webhooks/clerk/route.ts`

- [ ] **Crear `src/app/api/webhooks/clerk/route.ts`**

```typescript
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return new Response('CLERK_WEBHOOK_SECRET no configurado', { status: 500 })
  }

  const svix_id        = req.headers.get('svix-id')
  const svix_timestamp = req.headers.get('svix-timestamp')
  const svix_signature = req.headers.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Headers de svix ausentes', { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id':        svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch {
    return new Response('Firma de webhook inválida', { status: 400 })
  }

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email     = email_addresses[0]?.email_address ?? ''
    const firstName = first_name ?? ''
    const lastName  = last_name  ?? ''

    const supabase = createAdminClient()

    // Intentar vincular con usuario existente del seed (clerk_user_id = NULL, mismo nombre)
    const { data: seedUser } = await supabase
      .from('users')
      .select('id')
      .eq('first_name', firstName)
      .eq('last_name', lastName)
      .is('clerk_user_id', null)
      .maybeSingle()

    if (seedUser) {
      // Vincular cuenta Clerk con registro del seed
      await supabase
        .from('users')
        .update({
          clerk_user_id: id,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seedUser.id)
    } else {
      // Usuario nuevo no estaba en el seed — crear registro
      // family_id queda NULL, el admin lo asigna después
      await supabase
        .from('users')
        .upsert(
          {
            clerk_user_id: id,
            email,
            first_name: firstName,
            last_name:  lastName,
          },
          { onConflict: 'clerk_user_id' }
        )
    }
  }

  return new Response('OK', { status: 200 })
}
```

- [ ] **Configurar el webhook en Clerk Dashboard**

1. Ir a https://dashboard.clerk.com → tu aplicación
2. **Configure → Webhooks → Add Endpoint**
3. URL: `https://<tu-dominio>.vercel.app/api/webhooks/clerk`
   (Para desarrollo local usa ngrok: `ngrok http 3000` y usa la URL HTTPS que genera)
4. Suscribir a eventos: `user.created`, `user.updated`
5. Copiar el **Signing Secret** → pegarlo en `.env.local` como `CLERK_WEBHOOK_SECRET`

- [ ] **Commit**

```bash
git add src/app/api/webhooks/
git commit -m "feat: webhook Clerk para sincronizar usuarios con Supabase al primer login"
```

---

## Task 11: Header component

**Files:**
- Create: `src/components/Header.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Crear `src/components/Header.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'

const NAV_PUBLIC = [
  { href: '/normas', label: 'Normas' },
  { href: '/fotos',  label: 'Fotos'  },
]

const NAV_PRIVATE = [
  { href: '/calendario', label: 'Calendario' },
  { href: '/reservas',   label: 'Mis reservas' },
]

export function Header() {
  const pathname     = usePathname()
  const { isSignedIn } = useUser()

  const allLinks = isSignedIn
    ? [...NAV_PRIVATE, ...NAV_PUBLIC]
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
            const isActive = pathname === href
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

- [ ] **Actualizar `src/app/layout.tsx`** — añadir Header y padding top al body

```typescript
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Header } from '@/components/Header'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Casa Cervantes — Santoña',
    template: '%s — Casa Cervantes',
  },
  description: 'Gestión de reservas de la casa familiar en Calle Cervantes, Santoña, Cantabria.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
        <body className="font-sans bg-stone min-h-screen">
          <Header />
          <main className="pt-16">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Verificar visualmente** — http://localhost:3000. El header debe mostrarse fijo con "Casa Cervantes", los links de nav y el botón "Entrar".

- [ ] **Commit**

```bash
git add src/components/Header.tsx src/app/layout.tsx
git commit -m "feat: añadir Header fijo con navegación y autenticación Clerk"
```

---

## Task 12: Landing page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Reemplazar `src/app/page.tsx`**

```typescript
import Image from 'next/image'
import Link from 'next/link'

const STATS = [
  { num: '7',    label: 'Familias'      },
  { num: '21+',  label: 'Personas'      },
  { num: '30 €', label: '/ noche'       },
  { num: '15',   label: 'Noches máx.'  },
]

// Foto temporal de la costa cantábrica (sustituir por foto real de la casa)
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600&q=85'

export default function HomePage() {
  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center overflow-hidden">

        {/* Foto de fondo */}
        <div className="absolute inset-0 z-0">
          <Image
            src={HERO_IMAGE}
            alt="Costa cantábrica cerca de Santoña"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,35,55,0.55)] via-[rgba(20,35,55,0.3)] to-[rgba(20,35,55,0.72)]" />
        </div>

        {/* Contenido centrado */}
        <div className="relative z-10 px-8 max-w-3xl mx-auto">
          <p className="text-[11px] text-blue-light/90 tracking-[0.22em] uppercase mb-5 font-light">
            Santoña · Cantabria · Calle Cervantes
          </p>

          <h1 className="font-display text-5xl md:text-[62px] font-bold text-white leading-tight mb-5">
            La casa de todos<br />
            en el{' '}
            <em className="text-gold not-italic">Cantábrico</em>
          </h1>

          <p className="text-blue-light/80 text-lg font-light leading-relaxed mb-10 max-w-md mx-auto">
            7 familias, una casa compartida en Santoña.<br />
            Reserva tus días de forma sencilla y transparente.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/calendario" className="btn-primary text-base px-9 py-3.5">
              Ver calendario →
            </Link>
            <Link
              href="/normas"
              className="text-white/90 border border-white/30 hover:border-white/60 px-9 py-3.5 rounded-lg text-base font-medium transition-colors duration-150 backdrop-blur-sm"
            >
              Normas de uso
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 text-white/35 text-xs tracking-[0.3em] uppercase">
          ↓
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-white border-t-[3px] border-gold shadow-card">
        <div className="max-w-4xl mx-auto px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ num, label }) => (
            <div key={label} className="text-center">
              <div className="font-display text-3xl font-bold text-navy">{num}</div>
              <div className="text-xs text-muted uppercase tracking-widest mt-1.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DESCRIPCIÓN ── */}
      <section className="max-w-2xl mx-auto px-8 py-20 text-center">
        <h2 className="font-display text-3xl text-navy font-bold mb-5">
          Una casa, siete familias
        </h2>
        <p className="text-muted text-base leading-relaxed mb-4">
          La Casa Cervantes es el punto de encuentro de nuestra familia extendida en Santoña.
          Con esta aplicación gestionamos las reservas de forma transparente y equitativa:
          cada familia consulta disponibilidad, reserva sus fechas y gestiona sus estancias.
        </p>
        <p className="text-muted text-base leading-relaxed">
          El precio es de{' '}
          <strong className="text-navy font-semibold">30 €/noche</strong>,
          con un máximo de 15 noches consecutivas y 30 noches por familia
          en el horizonte de 4 meses. Agosto está reservado para la familia
          a la que corresponde ese año en rotación.
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Verificar visualmente** en http://localhost:3000:
  - Hero con foto de fondo, overlay marino, título con "Cantábrico" en dorado ✓
  - Botones "Ver calendario" y "Normas de uso" ✓
  - Stats bar con borde dorado superior ✓
  - Sección de descripción ✓

- [ ] **Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: landing page con hero a pantalla completa, stats bar y descripción"
```

---

## Task 13: Página de normas

**Files:**
- Create: `src/app/normas/page.tsx`

- [ ] **Crear `src/app/normas/page.tsx`**

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Normas de uso',
}

const NORMAS = [
  {
    num: '01',
    title: 'Máximo 15 noches seguidas',
    body: 'No se puede reservar más de 15 noches consecutivas en la misma estancia.',
  },
  {
    num: '02',
    title: 'Máximo 30 noches por familia',
    body: 'Cada familia tiene un límite de 30 noches en la ventana de reserva de 4 meses, sumando todas las reservas de sus miembros.',
  },
  {
    num: '03',
    title: 'Pago por transferencia',
    body: 'El precio es de 30 €/noche. El pago se realiza mediante transferencia bancaria. La aplicación no gestiona pagos.',
  },
  {
    num: '04',
    title: 'Cancelaciones',
    body: 'Si se cancela una reserva no se devuelve el dinero, salvo que otra persona quiera esos mismos días o por causa de fuerza mayor.',
  },
  {
    num: '05',
    title: 'Agosto restringido',
    body: 'Solo puede reservar en agosto la familia a la que le corresponde ese año. El turno rota entre las 7 familias y lo asigna el administrador.',
  },
  {
    num: '06',
    title: 'Antelación máxima de 4 meses',
    body: 'No se pueden hacer reservas con más de 4 meses de antelación respecto a la fecha de entrada.',
  },
  {
    num: '07',
    title: 'Año natural',
    body: 'Solo se puede reservar dentro del año en curso. El 1 de enero se abre la posibilidad de reservar en el nuevo año.',
  },
]

export default function NormasPage() {
  return (
    <div className="max-w-2xl mx-auto px-8 py-16">
      {/* Cabecera */}
      <div className="mb-12">
        <p className="text-xs text-blue tracking-[0.18em] uppercase mb-3 font-medium">
          Casa Cervantes · Santoña
        </p>
        <h1 className="font-display text-4xl text-navy font-bold mb-4">
          Normas de uso
        </h1>
        <p className="text-muted text-base leading-relaxed">
          Para que la casa funcione bien para todos, seguimos estas reglas acordadas entre las 7 familias.
        </p>
      </div>

      {/* Lista */}
      <div className="space-y-5">
        {NORMAS.map(({ num, title, body }) => (
          <div
            key={num}
            className="flex gap-6 p-6 bg-white rounded-xl border border-border shadow-card hover:shadow-card-hover transition-shadow duration-200"
          >
            <div className="font-display text-3xl font-bold text-gold/35 leading-none pt-0.5 w-10 flex-shrink-0 select-none">
              {num}
            </div>
            <div>
              <h2 className="font-display text-lg text-navy font-semibold mb-1.5">
                {title}
              </h2>
              <p className="text-muted text-sm leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 p-5 bg-navy/5 rounded-xl border border-navy/10 text-center">
        <p className="text-sm text-muted">
          ¿Tienes dudas? Contacta con el administrador de la aplicación.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Verificar visualmente** en http://localhost:3000/normas — 7 normas con numeración dorada, hover suave en las tarjetas.

- [ ] **Commit**

```bash
git add src/app/normas/
git commit -m "feat: página de normas con las 7 reglas de uso de la casa"
```

---

## Task 14: Página de sign-in

**Files:**
- Create: `src/app/sign-in/[[...sign-in]]/page.tsx`

- [ ] **Crear directorio y archivo**

```bash
mkdir -p "src/app/sign-in/[[...sign-in]]"
```

- [ ] **Crear `src/app/sign-in/[[...sign-in]]/page.tsx`**

```typescript
import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Entrar',
}

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-navy font-bold mb-2">
            Casa Cervantes
          </h1>
          <p className="text-muted text-sm">
            Accede con tu cuenta para gestionar tus reservas
          </p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox:           'w-full',
              card:              'shadow-card border border-border rounded-xl bg-white',
              headerTitle:       'font-display text-navy',
              headerSubtitle:    'text-muted',
              formButtonPrimary: 'bg-navy hover:bg-navy-dark transition-colors',
              footerAction:      'hidden',  // Sin enlace de registro
            },
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Verificar** en http://localhost:3000/sign-in — formulario Clerk con estilo, sin link de registro. ✓

- [ ] **Commit**

```bash
git add "src/app/sign-in/"
git commit -m "feat: página sign-in con Clerk sin opción de registro"
```

---

## Verificación final del Plan 1

- [ ] **Tests** — `npm run test:run` → ≥ 20 tests passing
- [ ] **Build** — `npm run build` → sin errores TypeScript ni de compilación
- [ ] **http://localhost:3000** — hero con foto, stats bar, descripción ✓
- [ ] **http://localhost:3000/normas** — 7 normas con diseño correcto ✓
- [ ] **http://localhost:3000/sign-in** — formulario Clerk, sin registro ✓
- [ ] **http://localhost:3000/calendario** — redirige a /sign-in ✓
- [ ] **http://localhost:3000/admin** — redirige a /sign-in ✓
- [ ] **Supabase Table Editor** — families: 7 filas, users: 21 filas ✓
- [ ] **Supabase Database → Functions** — `create_reservation`, `cancel_reservation`, `get_family_quota` ✓
- [ ] **Supabase Authentication → Policies** — políticas en las 6 tablas ✓

---

## Continúa en Plan 2 — Calendario y Reservas

El Plan 2 construye sobre esta base:
- `<DoubleCalendar />` con todos los estados visuales
- `<FamilyQuotaIndicator />` (barra de progreso 0–30 noches)
- `<ReservationConfirmModal />` y `<CancelConfirmModal />`
- API routes `POST /api/reservations` y `PATCH /api/reservations/[id]`
- Páginas `/calendario` y `/reservas`

Archivo: `docs/superpowers/plans/2026-04-12-plan-2-calendario.md`
