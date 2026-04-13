import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import type { ApiError } from '@/types'

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return Response.json({ error: 'No autenticado' } satisfies ApiError, { status: 401 })
  }

  const reservationId = params.id
  const supabase = createAdminClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (userError || !user) {
    return Response.json({ error: 'Usuario no encontrado en el sistema' } satisfies ApiError, { status: 404 })
  }

  const isAdmin = user.role === 'admin'

  const { error: rpcError } = await supabase.rpc('cancel_reservation', {
    p_user_id:        user.id,
    p_reservation_id: reservationId,
    p_is_admin:       isAdmin,
  })

  if (rpcError) {
    return Response.json({ error: rpcError.message } satisfies ApiError, { status: 400 })
  }

  return Response.json({ ok: true }, { status: 200 })
}
