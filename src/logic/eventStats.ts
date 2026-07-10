import dayjs from 'dayjs'
import type { SleepEvent } from './types'

// Сколько событий данного типа за календарный день dayTs
export function dayCount(events: SleepEvent[], type: string, dayTs: number): number {
  const d = dayjs(dayTs)
  return events.filter(e => e.type === type && dayjs(e.startedAt).isSame(d, 'day')).length
}

// Суммарная длительность интервальных событий типа за день, в минутах.
// Незавершённый интервал считается до now.
export function dayTotalMin(events: SleepEvent[], type: string, dayTs: number, now: number = Date.now()): number {
  const d = dayjs(dayTs)
  return Math.round(
    events
      .filter(e => e.type === type && dayjs(e.startedAt).isSame(d, 'day'))
      .reduce((sum, e) => sum + Math.max(0, ((e.endedAt ?? now) - e.startedAt) / 60000), 0)
  )
}
