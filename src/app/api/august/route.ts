// src/app/api/august/route.ts
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import type { ApiError } from '@/types'

export async function POST(req: Request): Promise<Response> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return Response.json({ error: 'No autenticado' } satisfies ApiError, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: caller } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!caller || caller.role !== 'admin') {
    return Response.json({ error: 'No autorizado' } satisfies ApiError, { status: 403 })
  }

  let body: { year: number; family_id: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' } satisfies ApiError, { status: 400 })
  }

  const { year, family_id } = body
  if (!year || !family_id) {
    return Response.json({ error: 'year y family_id son obligatorios' } satisfies ApiError, { status: 400 })
  }

  // Upsert: inserta o actualiza si ya existe para ese año
  const { error } = await supabase
    .from('august_assignments')
    .upsert({ year, family_id, assigned_by: caller.id }, { onConflict: 'year' })

  if (error) {
    return Response.json({ error: error.message } satisfies ApiError, { status: 400 })
  }

  return Response.json({ ok: true }, { status: 200 })
}
