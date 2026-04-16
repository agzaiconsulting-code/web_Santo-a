// src/app/api/photos/order/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { getSupabaseUser } from '@/lib/getUser'

export function validateOrderPayload(
  body: unknown
): { order: { id: string; sort_order: number }[] } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.order)) return null
  for (const item of b.order) {
    if (typeof (item as Record<string, unknown>).id !== 'string') return null
    if (typeof (item as Record<string, unknown>).sort_order !== 'number') return null
    if (!Number.isInteger((item as Record<string, unknown>).sort_order)) return null
    if ((item as Record<string, unknown>).sort_order < 0) return null
  }
  return b as { order: { id: string; sort_order: number }[] }
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const dbUser = await getSupabaseUser(userId)
  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const payload = validateOrderPayload(body)
  if (!payload) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()
  for (const { id, sort_order } of payload.order) {
    const { error } = await supabase
      .from('photos')
      .update({ sort_order })
      .eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Error al actualizar foto ' + id }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
