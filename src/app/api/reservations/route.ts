import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import type { CreateReservationRequest, CreateReservationResponse, ApiError } from '@/types'

export async function POST(req: Request): Promise<Response> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return Response.json({ error: 'No autenticado' } satisfies ApiError, { status: 401 })
  }

  let body: CreateReservationRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' } satisfies ApiError, { status: 400 })
  }

  const { check_in, check_out, for_user_id } = body
  if (!check_in || !check_out) {
    return Response.json({ error: 'check_in y check_out son obligatorios' } satisfies ApiError, { status: 400 })
  }

  const supabase = createAdminClient()

  // Caller
  const { data: caller, error: callerError } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (callerError || !caller) {
    return Response.json({ error: 'Usuario no encontrado en el sistema' } satisfies ApiError, { status: 404 })
  }

  // Si se pasa for_user_id, verificar que el caller es admin
  if (for_user_id && caller.role !== 'admin') {
    return Response.json({ error: 'No autorizado' } satisfies ApiError, { status: 403 })
  }

  const targetUserId = for_user_id ?? caller.id

  const { data: reservationId, error: rpcError } = await supabase
    .rpc('create_reservation', {
      p_user_id:   targetUserId,
      p_check_in:  check_in,
      p_check_out: check_out,
    })

  if (rpcError) {
    return Response.json({ error: rpcError.message } satisfies ApiError, { status: 400 })
  }

  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('id, check_in, check_out, nights, total_price')
    .eq('id', reservationId)
    .single()

  if (fetchError || !reservation) {
    return Response.json({ error: 'Error al recuperar la reserva creada' } satisfies ApiError, { status: 500 })
  }

  return Response.json(reservation satisfies CreateReservationResponse, { status: 201 })
}
