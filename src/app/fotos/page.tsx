// src/app/fotos/page.tsx
import type { Metadata } from 'next'
import { PhotoSlider } from '@/components/PhotoSlider'

export const metadata: Metadata = { title: 'Fotos' }

const PHOTOS = [
  '/images/WhatsApp Image 2026-04-12 at 21.37.07 (1).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.07.jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (1).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (2).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (3).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (4).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (5).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (6).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (7).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (8).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08 (9).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.08.jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.09 (1).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.09 (2).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.09 (3).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.09 (4).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.09 (5).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.09 (6).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.09 (7).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.09.jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.10 (1).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.10 (2).jpeg',
  '/images/WhatsApp Image 2026-04-12 at 21.37.10.jpeg',
  '/images/WhatsApp Image 2026-04-13 at 01.03.14.jpeg',
]

export default function FotosPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-navy">Fotos</h1>
        <p className="text-muted text-sm mt-1">Casa Cervantes · Santoña</p>
      </div>
      <PhotoSlider photos={PHOTOS} />
    </div>
  )
}
