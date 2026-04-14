// src/components/PhotoSlider.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface PhotoSliderProps {
  photos: string[]
}

export function PhotoSlider({ photos }: PhotoSliderProps) {
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const prev = useCallback(() => {
    setCurrent(i => (i === 0 ? photos.length - 1 : i - 1))
  }, [photos.length])

  const next = useCallback(() => {
    setCurrent(i => (i === photos.length - 1 ? 0 : i + 1))
  }, [photos.length])

  // Teclas de teclado
  useEffect(() => {
    if (!lightbox) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     setLightbox(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, prev, next])

  return (
    <div className="space-y-4">
      {/* Slider principal */}
      <div className="relative bg-stone rounded-2xl overflow-hidden aspect-[4/3] shadow-card group">
        <Image
          key={current}
          src={photos[current]}
          alt={`Foto ${current + 1} de ${photos.length}`}
          fill
          className="object-cover cursor-zoom-in transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 900px"
          onClick={() => setLightbox(true)}
          priority
        />

        {/* Flecha izquierda */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Foto anterior"
        >
          <ChevronLeft />
        </button>

        {/* Flecha derecha */}
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Foto siguiente"
        >
          <ChevronRight />
        </button>

        {/* Contador */}
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
          {current + 1} / {photos.length}
        </div>
      </div>

      {/* Miniaturas */}
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {photos.map((src, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
              i === current
                ? 'ring-2 ring-navy ring-offset-1'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            <Image
              src={src}
              alt={`Miniatura ${i + 1}`}
              fill
              className="object-cover"
              sizes="80px"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={photos[current]}
                alt={`Foto ${current + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>

            {/* Flechas lightbox */}
            <button
              onClick={prev}
              className="absolute left-[-3rem] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              aria-label="Foto anterior"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={next}
              className="absolute right-[-3rem] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              aria-label="Foto siguiente"
            >
              <ChevronRight />
            </button>

            {/* Cerrar */}
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-[-3rem] right-0 text-white/70 hover:text-white text-sm tracking-wide transition-colors"
            >
              Cerrar ✕
            </button>

            {/* Contador lightbox */}
            <p className="text-center text-white/50 text-sm mt-3">
              {current + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
