// src/lib/getUser.ts
// Busca al usuario en Supabase por clerk_user_id.
// Si no lo encuentra, intenta vincularlo por email (fallback para usuarios
// cuyo webhook user.created nunca llegó a dispararse).

import { clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import type { User } from '@/types'

const USER_SELECT = `
  id, clerk_user_id, email, first_name, last_name,
  family_id, role, receive_notifications, created_at, updated_at,
  family:families(id, name, created_at)
`.trim()

export async function getSupabaseUser(clerkUserId: string): Promise<User | null> {
  const supabase = createAdminClient()

  // 1. Búsqueda normal por clerk_user_id
  const { data: found } = await supabase
    .from('users')
    .select(USER_SELECT)
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (found) return found as unknown as User

  // 2. Fallback: obtener email de Clerk y buscar por email en Supabase
  try {
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.getUser(clerkUserId)
    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (!email) return null

    const { data: byEmail } = await supabase
      .from('users')
      .select(USER_SELECT)
      .eq('email', email)
      .is('clerk_user_id', null)
      .single()

    if (byEmail && typeof byEmail === 'object' && 'id' in byEmail) {
      // Vincular automáticamente
      await supabase
        .from('users')
        .update({ clerk_user_id: clerkUserId, updated_at: new Date().toISOString() })
        .eq('id', (byEmail as { id: string }).id)

      return { ...(byEmail as object), clerk_user_id: clerkUserId } as unknown as User
    }

    // 3. Fallback por nombre si el email no coincide
    const firstName = clerkUser.firstName ?? ''
    const lastName  = clerkUser.lastName  ?? ''

    if (firstName && lastName) {
      const { data: byName } = await supabase
        .from('users')
        .select(USER_SELECT)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .is('clerk_user_id', null)
        .single()

      if (byName && typeof byName === 'object' && 'id' in byName) {
        await supabase
          .from('users')
          .update({
            clerk_user_id: clerkUserId,
            email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (byName as { id: string }).id)

        return { ...(byName as object), clerk_user_id: clerkUserId, email } as unknown as User
      }
    }
  } catch {
    // Si falla la llamada a Clerk API, devolver null
  }

  return null
}
