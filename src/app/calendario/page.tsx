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
  const userPrevYearReservations =
    user.role === 'admin' && !forUser
      ? []
      : (prevYearRaw ?? []) as unknown as Reservation[]

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
