import { describe, it, expect } from 'vitest'
import { validateOrderPayload } from '@/lib/validatePhotoOrder'

describe('validateOrderPayload', () => {
  it('acepta payload válido', () => {
    const result = validateOrderPayload({
      order: [
        { id: 'abc-123', sort_order: 1 },
        { id: 'def-456', sort_order: 2 },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.order).toHaveLength(2)
  })

  it('rechaza payload sin order', () => {
    expect(validateOrderPayload({})).toBeNull()
  })

  it('rechaza payload con order que no es array', () => {
    expect(validateOrderPayload({ order: 'string' })).toBeNull()
  })

  it('rechaza item sin id', () => {
    expect(validateOrderPayload({ order: [{ sort_order: 1 }] })).toBeNull()
  })

  it('rechaza item con sort_order negativo', () => {
    expect(validateOrderPayload({ order: [{ id: 'x', sort_order: -1 }] })).toBeNull()
  })

  it('rechaza item con sort_order decimal', () => {
    expect(validateOrderPayload({ order: [{ id: 'x', sort_order: 1.5 }] })).toBeNull()
  })

  it('acepta lista vacía', () => {
    const result = validateOrderPayload({ order: [] })
    expect(result).not.toBeNull()
    expect(result!.order).toHaveLength(0)
  })
})
