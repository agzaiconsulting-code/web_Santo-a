export function validateOrderPayload(
  body: unknown
): { order: { id: string; sort_order: number }[] } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.order)) return null
  for (const item of b.order) {
    const itemObj = item as Record<string, unknown>
    if (typeof itemObj.id !== 'string') return null
    if (typeof itemObj.sort_order !== 'number') return null
    if (!Number.isInteger(itemObj.sort_order)) return null
    if (itemObj.sort_order < 0) return null
  }
  return b as { order: { id: string; sort_order: number }[] }
}
