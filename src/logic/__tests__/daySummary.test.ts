import { describe, it, expect } from 'vitest'
import { summarizeDay } from '../daySummary'

// Нормы для 6 мес: totalSleep ≈ [780, 900] (см. data/sleepNorms) — сборка
// текста проверяется по смысловым маркерам, не по точным цифрам норм.
function summary({ total = 0, night = 0, day = 0, naps = 0 } = {}) {
  return { totalSleepMin: total, nightSleepMin: night, daySleepMin: day, napCount: naps }
}

describe('summarizeDay — пустой день', () => {
  it('прошедший день без отметок', () => {
    expect(summarizeDay({ summary: summary() })).toBe('За этот день отметок нет.')
  })

  it('текущий день без отметок — приглашение отмечать', () => {
    expect(summarizeDay({ summary: summary(), isToday: true })).toContain('пока нет отметок')
  })
})

describe('summarizeDay — сон и нормы', () => {
  it('хороший день: сон по норме', () => {
    const text = summarizeDay({ summary: summary({ total: 850, night: 600, day: 250, naps: 3 }), ageM: 6 })
    expect(text).toContain('Всего сна')
    expect(text).toContain('отличный день по сну')
  })

  it('недосып: рекомендация раннего укладывания', () => {
    const text = summarizeDay({ summary: summary({ total: 500, night: 400, day: 100, naps: 2 }), ageM: 6 })
    expect(text).toContain('сна маловато')
  })

  it('текущий день — без вердикта по норме', () => {
    const text = summarizeDay({ summary: summary({ total: 300, night: 200, day: 100, naps: 1 }), isToday: true, ageM: 6 })
    expect(text).toContain('День ещё идёт')
    expect(text).toContain('Пока наспано')
  })
})

describe('summarizeDay — события дня', () => {
  it('выкладывание и стул попадают в сводку', () => {
    const text = summarizeDay({
      summary: summary({ total: 800, night: 600, day: 200, naps: 3 }),
      tummyMin: 25,
      poopCount: 2,
      ageM: 6
    })
    // Первое событие в перечислении капитализируется
    expect(text).toContain('На животе 25 мин')
    expect(text).toContain('2 раза')
  })

  it('склонение по полу: девочка', () => {
    const text = summarizeDay({
      summary: summary({ total: 800, night: 600, day: 200, naps: 3 }),
      poopCount: 1,
      gender: 'female',
      ageM: 6
    })
    expect(text).toContain('Покакала 1 раз')
  })

  it('без стула — отдельная строка', () => {
    const text = summarizeDay({ summary: summary({ total: 800, night: 600, day: 200, naps: 3 }), ageM: 6 })
    expect(text).toContain('Стула не было.')
  })
})
