// src/app/reservas/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { ReservationList } from '@/components/ReservationList'
import type { Reservation } from '@/types'

export const metadata: Metadata = { title: 'Mis reservas' }

export default async function ReservasPage() {
  const { userId: clerkUserId } = auth()
  if (!clerkUserId) redirect('/sign-in')

  const supabase = createAdminClient()

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) redirect('/sign-in')

  const { data: allReservations } = await supabase
    .from('reservations')
    .select('id, user_id, check_in, check_out, nights, total_price, status, created_at, updated_at, cancelled_at')
    .eq('user_id', user.id)
    .order('check_in', { ascending: false })

  const reservations = (allReservations ?? []) as unknown as Reservation[]
  const today = new Date().toISOString().split('T')[0]

  const activeReservations = reservations.filter(r => r.status === 'active')
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
