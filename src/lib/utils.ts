/**
 * Formatea 'YYYY-MM-DD' como '15 jul 2026'
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Formatea 'YYYY-MM-DD' como '15 de julio de 2026' (formato largo)
 */
export function formatDateLong(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Calcula noches entre check_in y check_out ('YYYY-MM-DD')
 */
export function calcNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Calcula precio total: noches × 30 €
 */
export function calcPrice(nights: number): number {
  return nights * Number(process.env.NEXT_PUBLIC_PRICE_PER_NIGHT ?? 30)
}

/**
 * Formatea precio: 210 → '210 €'
 */
export function formatPrice(amount: number): string {
  return `${amount} €`
}

/**
 * Devuelve true si una fecha ISO cae en agosto
 */
export function isAugust(isoDate: string): boolean {
  return new Date(isoDate + 'T00:00:00').getMonth() === 7 // getMonth() es 0-indexed
}

/**
 * Nombre del mes en español (1-indexed)
 */
export function monthName(month: number): string {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return names[month - 1] ?? ''
}

/**
 * Nombre abreviado del mes (ene, feb…)
 */
export function monthNameShort(month: number): string {
  return monthName(month).substring(0, 3).toLowerCase()
}

/**
 * Genera un array de objetos {date: 'YYYY-MM-DD', dayOfMonth: number}
 * para todos los días de un mes dado.
 */
export function getDaysInMonth(year: number, month: number): Array<{ date: string; dayOfMonth: number }> {
  const days: Array<{ date: string; dayOfMonth: number }> = []
  const daysInMonth = new Date(year, month, 0).getDate() // month es 1-indexed aquí
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push({ date: `${year}-${mm}-${dd}`, dayOfMonth: d })
  }
  return days
}

/**
 * Día de la semana de inicio del mes (0=Dom, 1=Lun…) ajustado a lunes primero
 * Devuelve 0 para Lunes, 6 para Domingo
 */
export function getMonthStartDayOffset(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Dom
  return firstDay === 0 ? 6 : firstDay - 1 // Convertir a lunes=0
}

/**
 * Comprueba si una fecha ISO está dentro de un rango [checkIn, checkOut)
 */
export function isDateInRange(date: string, checkIn: string, checkOut: string): boolean {
  return date >= checkIn && date < checkOut
}

/**
 * Devuelve 'YYYY-MM-DD' de hoy
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
