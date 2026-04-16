// src/components/PhotoOrderAdmin.tsx
'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Photo } from '@/types'

interface PhotoOrderAdminProps {
  photos: Pick<Photo, 'id' | 'url' | 'sort_order'>[]
}

interface SortablePhotoProps {
  photo: Pick<Photo, 'id' | 'url'>
  index: number
}

function SortablePhoto({ photo, index }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing ring-1 ring-border hover:ring-navy/40 transition-shadow"
    >
      <Image
        src={photo.url}
        alt={`Foto ${index + 1}`}
        fill
        className="object-cover pointer-events-none"
        sizes="120px"
      />
      <div className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-tl-md select-none">
        {index + 1}
      </div>
    </div>
  )
}

export function PhotoOrderAdmin({ photos: initialPhotos }: PhotoOrderAdminProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setPhotos(prev => {
      const oldIndex = prev.findIndex(p => p.id === active.id)
      const newIndex = prev.findIndex(p => p.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
    setDirty(true)
    setSaved(false)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const order = photos.map((p, i) => ({ id: p.id, sort_order: i + 1 }))
    const res = await fetch('/api/photos/order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    })
    setSaving(false)
    if (res.ok) {
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }, [photos])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Arrastra las fotos para cambiar el orden. El cambio se guarda al pulsar el botón.
        </p>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">Guardado</span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="bg-navy text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar orden'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={photos.map(p => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {photos.map((photo, index) => (
              <SortablePhoto key={photo.id} photo={photo} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
