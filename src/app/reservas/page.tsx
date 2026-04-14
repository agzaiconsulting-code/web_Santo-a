// src/app/reservas/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { ReservationList } from '@/components/ReservationList'
import type { Reservation, User } from '@/types'

export const metadata: Metadata = { title: 'Reservas' }

export default async function ReservasPage() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!currentUser) redirect('/sign-in')

  const isAdmin = currentUser.role === 'admin'
  const today   = new Date().toISOString().split('T')[0]

  if (isAdmin) {
    // Admin: cargar todas las reservas y todos los usuarios
    const [
      { data: allReservationsRaw },
      { data: allUsersRaw },
    ] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at, user:users(id, first_name, last_name, family:families(name))')
        .order('check_in', { ascending: false }),
      supabase
        .from('users')
        .select('id, first_name, last_name, family_id, family:families(name)')
        .order('family_id')
        .order('first_name'),
    ])

    const allReservations = (allReservationsRaw ?? []) as unknown as Reservation[]
    const allUsers        = (allUsersRaw ?? []) as unknown as User[]

    const activeReservations = allReservations.filter(r => r.status === 'active' && r.check_out > today)
    const pastReservations   = allReservations.filter(r => r.status === 'cancelled' || r.check_out <= today)

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-navy">Reservas</h1>
          <p className="text-muted text-sm mt-1">Vista de administrador — todas las familias</p>
        </div>
        <ReservationList
          activeReservations={activeReservations}
          pastReservations={pastReservations}
          isAdmin={true}
          allUsers={allUsers}
        />
      </div>
    )
  }

  // Usuario normal: solo sus reservas
  const { data: allReservations } = await supabase
    .from('reservations')
    .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at')
    .eq('user_id', currentUser.id)
    .order('check_in', { ascending: false })

  const reservations       = (allReservations ?? []) as unknown as Reservation[]
  const activeReservations = reservations.filter(r => r.status === 'active' && r.check_out > today)
  const pastReservations   = reservations.filter(r => r.status === 'cancelled' || r.check_out <= today)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-navy">Mis reservas</h1>
        <p className="text-muted text-sm mt-1">Gestiona tus reservas en Casa Cervantes</p>
      </div>
      <ReservationList
        activeReservations={activeReservations}
        pastReservations={pastReservations}
      />
    </div>
  )
}
