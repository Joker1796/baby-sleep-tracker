import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import { dayCount, dayTotalMin } from '../eventStats'

const day = dayjs('2025-06-10T00:00:00')
const at = (h, m = 0) => day.hour(h).minute(m).valueOf()
const dayTs = day.valueOf()

describe('dayCount', () => {
  it('считает только события нужного типа за нужный день', () => {
    const events = [
      { type: 'poop', startedAt: at(9) },
      { type: 'poop', startedAt: at(15) },
      { type: 'diaper', startedAt: at(10) },
      { type: 'poop', startedAt: day.add(1, 'day').hour(9).valueOf() }
    ]
    expect(dayCount(events, 'poop', dayTs)).toBe(2)
    expect(dayCount(events, 'diaper', dayTs)).toBe(1)
    expect(dayCount(events, 'bath', dayTs)).toBe(0)
  })

  it('пустой список — ноль', () => {
    expect(dayCount([], 'poop', dayTs)).toBe(0)
  })
})

describe('dayTotalMin', () => {
  it('суммирует длительности завершённых интервалов за день', () => {
    const events = [
      { type: 'walk', startedAt: at(10), endedAt: at(10, 40) },
      { type: 'walk', startedAt: at(16), endedAt: at(16, 20) },
      { type: 'walk', startedAt: day.subtract(1, 'day').hour(10).valueOf(), endedAt: day.subtract(1, 'day').hour(11).valueOf() }
    ]
    expect(dayTotalMin(events, 'walk', dayTs)).toBe(60)
  })

  it('незавершённый интервал считается до now', () => {
    const events = [{ type: 'tummy', startedAt: at(12), endedAt: null }]
    expect(dayTotalMin(events, 'tummy', dayTs, at(12, 15))).toBe(15)
  })

  it('отрицательные интервалы (окончание раньше начала) не уходят в минус', () => {
    const events = [{ type: 'walk', startedAt: at(12), endedAt: at(11) }]
    expect(dayTotalMin(events, 'walk', dayTs)).toBe(0)
  })
})
