// src/app/calendario/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { DoubleCalendar } from '@/components/DoubleCalendar'
import { FamilyQuotaIndicator } from '@/components/FamilyQuotaIndicator'
import type { Reservation, User } from '@/types'

export const metadata: Metadata = { title: 'Calendario' }

export default async function CalendarioPage() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  // 1. Obtener el usuario actual
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at, family:families(id, name, created_at)')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!currentUser) redirect('/sign-in')

  const user = currentUser as unknown as User & { family: { id: string; name: string; created_at: string } | null }

  // 2. Todas las reservas activas con datos del usuario
  const { data: reservationsRaw } = await supabase
    .from('reservations')
    .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at, user:users(id, clerk_user_id, email, first_name, last_name, family_id, role, receive_notifications, created_at, updated_at)')
    .eq('status', 'active')
    .order('check_in')

  const reservations = (reservationsRaw ?? []) as unknown as Reservation[]

  // 3. Asignación de agosto del año en curso
  const currentYear = new Date().getFullYear()
  const { data: augustAssignment } = await supabase
    .from('august_assignments')
    .select('family_id')
    .eq('year', currentYear)
    .maybeSingle()

  // 4. Cuota familiar usada
  let quotaUsed = 0
  if (user.family_id) {
    const { data: quota } = await supabase
      .rpc('get_family_quota', { p_family_id: user.family_id })
    quotaUsed = quota ?? 0
  }

  const familyName = user.family?.name ?? 'Tu familia'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Calendario</h1>
        <p className="text-muted text-sm mt-1">
          Selecciona las fechas de entrada y salida para hacer una reserva
        </p>
      </div>

      {user.family_id ? (
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
      />
    </div>
  )
}
