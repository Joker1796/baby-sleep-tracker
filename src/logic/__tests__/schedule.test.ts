import { describe, it, expect } from 'vitest'
import { buildSchedule } from '../schedule'
import type { ScheduleProfile } from '../schedule'

const profile: ScheduleProfile = {
  hasData: true,
  daysCounted: 7,
  wakeMin: 7 * 60,
  bedMin: 20 * 60,
  napCount: 2,
  napDurationMin: 90,
  wwRange: [150, 180]
}

const ANCHOR_PRE = 30
const ANCHOR_POST = 45

describe('buildSchedule — окна бодрствования', () => {
  it('окна растут к вечеру: первое короче последнего', () => {
    const s = buildSchedule(profile)
    expect(s.naps[0].wwBeforeMin).toBeLessThan(s.wwBeforeBedMin)
  })

  it('расписание заполняет день целиком (окна + сны = от подъёма до отбоя)', () => {
    const s = buildSchedule(profile)
    const naps = s.naps.reduce((sum, n) => sum + n.durMin, 0)
    const windows = s.naps.reduce((sum, n) => sum + n.wwBeforeMin, 0) + s.wwBeforeBedMin
    expect(naps + windows).toBe(profile.bedMin - profile.wakeMin)
  })
})

describe('buildSchedule — события календаря', () => {
  it('помечает расписание перестроенным при наличии событий', () => {
    const s = buildSchedule(profile, { anchors: [{ min: 11 * 60, label: 'Врач', icon: '🩺' }] })
    expect(s.adjusted).toBe(true)
    expect(s.anchors[0].hhmm).toBe('11:00')
  })

  it('ни один сон не накрывает время события (± буфер)', () => {
    for (const min of [11 * 60, 13 * 60 + 30, 16 * 60]) {
      const s = buildSchedule(profile, { anchors: [{ min, label: 'Событие', icon: '📌' }] })
      const lo = min - ANCHOR_PRE
      const hi = min + ANCHOR_POST
      for (const n of s.naps) {
        expect(n.endMin <= lo || n.startMin >= hi).toBe(true)
      }
    }
  })
})
