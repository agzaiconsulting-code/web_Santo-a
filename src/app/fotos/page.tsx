// src/app/fotos/page.tsx
import type { Metadata } from 'next'
import { PhotoSlider } from '@/components/PhotoSlider'
import { createAdminClient } from '@/lib/supabase'
import type { Photo } from '@/types'

export const metadata: Metadata = { title: 'Fotos' }

export default async function FotosPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('photos')
    .select('id, url, sort_order')
    .order('sort_order')

  const photos = ((data ?? []) as Pick<Photo, 'id' | 'url' | 'sort_order'>[])
    .map(p => p.url)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-navy">Fotos</h1>
        <p className="text-muted text-sm mt-1">Casa Cervantes · Santoña</p>
      </div>
      <PhotoSlider photos={photos} />
    </div>
  )
}
