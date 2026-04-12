import { describe, it, expect } from 'vitest'
import {
  calcNights,
  calcPrice,
  isAugust,
  formatPrice,
  monthName,
  monthNameShort,
  getDaysInMonth,
  getMonthStartDayOffset,
  isDateInRange,
} from '@/lib/utils'

describe('calcNights', () => {
  it('calcula 7 noches correctamente', () => {
    expect(calcNights('2026-07-18', '2026-07-25')).toBe(7)
  })
  it('calcula 1 noche', () => {
    expect(calcNights('2026-07-01', '2026-07-02')).toBe(1)
  })
  it('calcula 15 noches (máximo permitido)', () => {
    expect(calcNights('2026-07-01', '2026-07-16')).toBe(15)
  })
})

describe('calcPrice', () => {
  it('calcula 7 noches × 30 = 210', () => {
    expect(calcPrice(7)).toBe(210)
  })
  it('calcula 15 noches × 30 = 450', () => {
    expect(calcPrice(15)).toBe(450)
  })
})

describe('isAugust', () => {
  it('detecta 15 de agosto como agosto', () => {
    expect(isAugust('2026-08-15')).toBe(true)
  })
  it('detecta 1 de agosto como agosto', () => {
    expect(isAugust('2026-08-01')).toBe(true)
  })
  it('rechaza 31 de julio', () => {
    expect(isAugust('2026-07-31')).toBe(false)
  })
  it('rechaza septiembre', () => {
    expect(isAugust('2026-09-01')).toBe(false)
  })
})

describe('formatPrice', () => {
  it('formatea 210 como "210 €"', () => {
    expect(formatPrice(210)).toBe('210 €')
  })
  it('formatea 0 como "0 €"', () => {
    expect(formatPrice(0)).toBe('0 €')
  })
})

describe('monthName', () => {
  it('devuelve Enero para el mes 1', () => {
    expect(monthName(1)).toBe('Enero')
  })
  it('devuelve Agosto para el mes 8', () => {
    expect(monthName(8)).toBe('Agosto')
  })
  it('devuelve Diciembre para el mes 12', () => {
    expect(monthName(12)).toBe('Diciembre')
  })
})

describe('monthNameShort', () => {
  it('devuelve "ago" para mes 8', () => {
    expect(monthNameShort(8)).toBe('ago')
  })
  it('devuelve "ene" para mes 1', () => {
    expect(monthNameShort(1)).toBe('ene')
  })
})

describe('getDaysInMonth', () => {
  it('julio 2026 tiene 31 días', () => {
    const days = getDaysInMonth(2026, 7)
    expect(days).toHaveLength(31)
    expect(days[0].date).toBe('2026-07-01')
    expect(days[30].date).toBe('2026-07-31')
  })
  it('febrero 2026 tiene 28 días (no bisiesto)', () => {
    const days = getDaysInMonth(2026, 2)
    expect(days).toHaveLength(28)
  })
  it('febrero 2024 tiene 29 días (bisiesto)', () => {
    const days = getDaysInMonth(2024, 2)
    expect(days).toHaveLength(29)
  })
})

describe('getMonthStartDayOffset', () => {
  it('julio 2026 empieza en miércoles (offset 2)', () => {
    // 1 julio 2026 = miércoles → offset 2 (lunes=0, martes=1, miércoles=2)
    expect(getMonthStartDayOffset(2026, 7)).toBe(2)
  })
})

describe('isDateInRange', () => {
  it('fecha dentro del rango', () => {
    expect(isDateInRange('2026-07-20', '2026-07-18', '2026-07-25')).toBe(true)
  })
  it('fecha igual a check_in está incluida', () => {
    expect(isDateInRange('2026-07-18', '2026-07-18', '2026-07-25')).toBe(true)
  })
  it('fecha igual a check_out NO está incluida (es día de salida)', () => {
    expect(isDateInRange('2026-07-25', '2026-07-18', '2026-07-25')).toBe(false)
  })
  it('fecha fuera del rango', () => {
    expect(isDateInRange('2026-07-26', '2026-07-18', '2026-07-25')).toBe(false)
  })
})
