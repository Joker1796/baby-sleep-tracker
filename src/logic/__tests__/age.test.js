import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import { ageInMonths, formatAge, formatDurationMin, plural } from '../age'

const NOW = dayjs('2026-07-04T12:00:00').valueOf()

describe('ageInMonths', () => {
  it('считает полные месяцы', () => {
    expect(ageInMonths('2026-02-01', NOW)).toBe(5)
    expect(ageInMonths('2026-01-04', NOW)).toBe(6)
    expect(ageInMonths('2026-01-05', NOW)).toBe(5)
  })

  it('новорождённый — 0 месяцев', () => {
    expect(ageInMonths('2026-06-20', NOW)).toBe(0)
  })
})

describe('formatAge', () => {
  it('дни для самых маленьких', () => {
    expect(formatAge('2026-06-30', NOW)).toBe('4 дня')
    expect(formatAge('2026-07-03', NOW)).toBe('1 день')
  })

  it('недели до месяца', () => {
    expect(formatAge('2026-06-10', NOW)).toContain('недел')
  })

  it('месяцы и недели', () => {
    expect(formatAge('2026-02-01', NOW)).toMatch(/^5 мес/)
  })
})

describe('formatDurationMin', () => {
  it('форматирует минуты и часы', () => {
    expect(formatDurationMin(25)).toBe('25 мин')
    expect(formatDurationMin(60)).toBe('1 ч')
    expect(formatDurationMin(75)).toBe('1 ч 15 мин')
  })
})

describe('plural', () => {
  it('выбирает форму по числу', () => {
    expect(plural(1, 'раз', 'раза', 'раз')).toBe('раз')
    expect(plural(2, 'раз', 'раза', 'раз')).toBe('раза')
    expect(plural(5, 'раз', 'раза', 'раз')).toBe('раз')
    expect(plural(0, 'сон', 'сна', 'снов')).toBe('снов')
    expect(plural(21, 'сон', 'сна', 'снов')).toBe('сон')
  })
})
