'use client'

import { useRouter } from 'next/navigation'

export function YearNav({ year }: { year: number }) {
  const router = useRouter()
  const go = (y: number) => router.push(`/admin?year=${y}`)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(year - 1)}
        className="p-1.5 rounded-lg border border-border hover:bg-stone transition-colors text-muted hover:text-navy"
        aria-label="Año anterior"
      >
        ‹
      </button>
      <span className="text-lg font-bold text-navy w-12 text-center">{year}</span>
      <button
        onClick={() => go(year + 1)}
        className="p-1.5 rounded-lg border border-border hover:bg-stone transition-colors text-muted hover:text-navy"
        aria-label="Año siguiente"
      >
        ›
      </button>
    </div>
  )
}
