// src/app/admin/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { AdminTabs } from '@/components/AdminTabs'
import { AugustAssignment } from '@/components/AugustAssignment'
import { formatPrice } from '@/lib/utils'
import type { Reservation, Family } from '@/types'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminPage() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!currentUser || currentUser.role !== 'admin') redirect('/')

  const currentYear = new Date().getFullYear()

  const [
    { data: reservationsRaw },
    { data: augustAssignment },
    { data: familiesRaw },
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
  ])

  const reservations   = (reservationsRaw ?? []) as unknown as Reservation[]
  const families       = (familiesRaw ?? []) as unknown as Family[]

  // Calcular stats
  const activeReservations = reservations.filter(r => r.status === 'active')
  const totalNights  = activeReservations.reduce((s, r) => s + r.nights, 0)
  const totalIncome  = activeReservations.reduce((s, r) => s + r.total_price, 0)
  const augustFamily = (augustAssignment as unknown as { family?: { name: string } | null } | null)?.family?.name ?? '—'
  const augustFamilyId = (augustAssignment as { family_id?: string } | null)?.family_id ?? null

  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Panel de administración</h1>
        <p className="text-muted text-sm mt-1">Resumen de reservas · {currentYear}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Reservas activas"  value={String(activeReservations.length)} sub="este año" />
        <StatCard label="Noches totales"    value={String(totalNights)}               sub={`año ${currentYear}`} />
        <StatCard label="Ingresos"          value={formatPrice(totalIncome)}           sub={`año ${currentYear}`} />
        <StatCard label="Familia de agosto" value={augustFamily}                       sub={String(currentYear)} />
      </div>

      {/* Asignación agosto */}
      <AugustAssignment
        year={currentYear}
        families={families}
        currentFamilyId={augustFamilyId}
      />

      {/* Tabs por mes */}
      <div>
        <h2 className="font-display text-xl font-semibold text-navy mb-4">Reservas por mes</h2>
        <AdminTabs reservations={reservations} initialMonth={currentMonth} />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-card">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-navy mt-1">{value}</p>
      <p className="text-xs text-blue mt-0.5">{sub}</p>
    </div>
  )
}
