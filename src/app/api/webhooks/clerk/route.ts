import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return new Response('CLERK_WEBHOOK_SECRET no configurado', { status: 500 })
  }

  const svix_id        = req.headers.get('svix-id')
  const svix_timestamp = req.headers.get('svix-timestamp')
  const svix_signature = req.headers.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Headers de svix ausentes', { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id':        svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch {
    return new Response('Firma de webhook inválida', { status: 400 })
  }

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email     = email_addresses[0]?.email_address ?? ''
    const firstName = first_name ?? ''
    const lastName  = last_name  ?? ''

    const supabase = createAdminClient()

    // Intentar vincular con usuario existente del seed (clerk_user_id = NULL, mismo nombre)
    const { data: seedUser } = await supabase
      .from('users')
      .select('id')
      .eq('first_name', firstName)
      .eq('last_name', lastName)
      .is('clerk_user_id', null)
      .maybeSingle()

    if (seedUser) {
      // Vincular cuenta Clerk con registro del seed
      await supabase
        .from('users')
        .update({
          clerk_user_id: id,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seedUser.id)
    } else {
      // Usuario nuevo no estaba en el seed — crear registro
      // family_id queda NULL, el admin lo asigna después
      await supabase
        .from('users')
        .upsert(
          {
            clerk_user_id: id,
            email,
            first_name: firstName,
            last_name:  lastName,
          },
          { onConflict: 'clerk_user_id' }
        )
    }
  }

  return new Response('OK', { status: 200 })
}
