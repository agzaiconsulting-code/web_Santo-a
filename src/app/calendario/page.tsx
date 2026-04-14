// src/app/calendario/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { DoubleCalendar } from '@/components/DoubleCalendar'
import { FamilyQuotaIndicator } from '@/components/FamilyQuotaIndicator'
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

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at, family:families(id, name, created_at)')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!currentUser) redirect('/sign-in')

  const user = currentUser as unknown as User & { family: { id: string; name: string; created_at: string } | null }

  // Cargar forUser si el admin pasa ?for=<userId>
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

  // El usuario efectivo para cuota y restricciones de agosto
  const effectiveUser = forUser ?? user

  const currentYear = new Date().getFullYear()

  const [
    { data: reservationsRaw },
    { data: augustAssignment },
    { data: quota },
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at, user:users(id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at)')
      .eq('status', 'active')
      .order('check_in'),
    supabase
      .from('august_assignments')
      .select('family_id')
      .eq('year', currentYear)
      .maybeSingle(),
    effectiveUser.family_id
      ? supabase.rpc('get_family_quota', { p_family_id: effectiveUser.family_id })
      : Promise.resolve({ data: 0, error: null }),
  ])

  const reservations = (reservationsRaw ?? []) as unknown as Reservation[]
  const quotaUsed    = (quota as number | null) ?? 0
  const familyName   = (effectiveUser as User & { family?: { name: string } | null }).family?.name ?? 'Tu familia'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Calendario</h1>
        <p className="text-muted text-sm mt-1">
          Selecciona las fechas de entrada y salida para hacer una reserva
        </p>
      </div>

      {effectiveUser.family_id ? (
        <FamilyQuotaIndicator familyName={familyName} usedNights={quotaUsed} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          Tu cuenta todavía no tiene una familia asignada. Contacta con el administrador para poder hacer reservas.
        </div>
      )}

      <DoubleCalendar
        reservations={reservations}
        currentUser={user}
        augustFamilyId={augustAssignment?.family_id ?? null}
        quotaUsed={quotaUsed}
        forUser={forUser ?? undefined}
      />
    </div>
  )
}
