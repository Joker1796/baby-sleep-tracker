import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import { analyzeDay, currentState, lastNapToday } from '../sleepAnalyzer'

import type { SleepEvent } from '../types'

const ts = (s: string) => dayjs(s).valueOf()

function sleep(start: string, end: string | null): SleepEvent {
  return { id: start, childId: 'c1', note: '', type: 'sleep', startedAt: ts(start), endedAt: end ? ts(end) : null }
}

function bath(start: string, end: string | null): SleepEvent {
  return { id: 'bath' + start, childId: 'c1', note: '', type: 'bath', startedAt: ts(start), endedAt: end ? ts(end) : null }
}

const NOW = ts('2026-07-04T16:00:00')

describe('analyzeDay', () => {
  it('делит сон на дневной и ночной, ночь через полночь учитывается', () => {
    const events = [
      sleep('2026-07-03T20:00', '2026-07-04T06:30'), // ночь: 390 мин попадает на 4 июля
      sleep('2026-07-04T09:00', '2026-07-04T10:00'), // дневной 60 мин
      sleep('2026-07-04T13:00', '2026-07-04T14:30') // дневной 90 мин
    ]
    const day = analyzeDay(events, NOW, NOW)
    expect(day.nightSleepMin).toBe(390)
    expect(day.daySleepMin).toBe(150)
    expect(day.totalSleepMin).toBe(540)
    expect(day.napCount).toBe(2)
  })

  it('идущий сейчас сон учитывается до текущего момента', () => {
    const events = [sleep('2026-07-04T15:00', null)]
    const day = analyzeDay(events, NOW, NOW)
    expect(day.daySleepMin).toBe(60)
  })

  it('пустой день', () => {
    const day = analyzeDay([], NOW, NOW)
    expect(day.totalSleepMin).toBe(0)
    expect(day.napCount).toBe(0)
  })

  it('отбой после купания 19:30 не считается дневным сном', () => {
    const END = ts('2026-07-04T22:00:00')
    const events = [
      sleep('2026-07-03T20:00', '2026-07-04T07:00'), // ночь
      sleep('2026-07-04T13:00', '2026-07-04T14:30'), // дневной 90
      bath('2026-07-04T19:30', '2026-07-04T20:00'),
      sleep('2026-07-04T20:15', null) // ночной отбой после купания
    ]
    const day = analyzeDay(events, END, END)
    expect(day.napCount).toBe(1)
    expect(day.daySleepMin).toBe(90)
    // Ночь = 420 (утренний хвост) + 105 (отбой 20:15→22:00)
    expect(day.nightSleepMin).toBe(525)
  })

  it('без купания последний сон с 20:00 — ночной', () => {
    const END = ts('2026-07-04T22:00:00')
    const events = [
      sleep('2026-07-04T13:00', '2026-07-04T14:30'), // дневной 90
      sleep('2026-07-04T20:00', null) // отбой, без пробуждений — ночной
    ]
    const day = analyzeDay(events, END, END)
    expect(day.napCount).toBe(1)
    expect(day.daySleepMin).toBe(90)
  })

  it('поздний сон до 21:00 без вечернего сна — дневной', () => {
    const END = ts('2026-07-04T20:30:00')
    const events = [
      sleep('2026-07-04T18:30', '2026-07-04T19:15') // 45 мин, начат до 19:00 → дневной
    ]
    const day = analyzeDay(events, END, END)
    expect(day.napCount).toBe(1)
    expect(day.daySleepMin).toBe(45)
  })
})

describe('currentState', () => {
  it('бодрствует после завершённого сна', () => {
    const events = [sleep('2026-07-04T13:00', '2026-07-04T14:30')]
    const s = currentState(events, NOW)
    expect(s.sleeping).toBeNull()
    expect(s.lastWakeAt).toBe(ts('2026-07-04T14:30'))
    expect(s.awakeMin).toBe(90)
  })

  it('спит, если сон не завершён', () => {
    const events = [sleep('2026-07-04T15:30', null)]
    const s = currentState(events, NOW)
    expect(s.sleeping).not.toBeNull()
    expect(s.sleepingMin).toBe(30)
  })

  it('устаревшее пробуждение (>18 ч назад) не используется', () => {
    const events = [sleep('2026-07-02T13:00', '2026-07-02T14:00')]
    const s = currentState(events, NOW)
    expect(s.lastWakeAt).toBeNull()
    expect(s.awakeMin).toBeNull()
  })
})

describe('lastNapToday', () => {
  it('возвращает последний завершённый дневной сон за сегодня', () => {
    const events = [
      sleep('2026-07-03T13:00', '2026-07-03T14:00'), // вчера — не считается
      sleep('2026-07-04T09:00', '2026-07-04T10:00'),
      sleep('2026-07-04T13:00', '2026-07-04T13:30')
    ]
    const nap = lastNapToday(events, NOW)
    expect(nap!.startedAt).toBe(ts('2026-07-04T13:00'))
  })
})
